import { createHash, randomBytes } from 'node:crypto';
import type { Db } from 'mongodb';
import type { Caller } from './policies';
import { dbError, type DbResult, type Row } from './types';

type RpcFn = (db: Db, args: Row, caller: Caller) => Promise<unknown>;

const ok = (data: unknown): DbResult => ({ data, error: null, count: null, status: 200, statusText: 'OK' });

async function roleOf(db: Db, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const row = await db.collection('user_roles').findOne({ user_id: userId });
  return (row?.role as string) ?? null;
}

async function reviewerRole(db: Db, userId: string): Promise<string> {
  if (await db.collection('coaches').findOne({ user_id: userId })) return 'coach';
  return (await roleOf(db, userId)) ?? 'athlete';
}

async function addActivityLog(db: Db, args: Row): Promise<null> {
  const entry = {
    timestamp: new Date().toISOString(),
    action: args.p_action,
    by_user: args.p_by_user,
    by_role: await reviewerRole(db, args.p_by_user),
    ...(args.p_details ?? {}),
  };
  const app = await db.collection('membership_applications').findOne({ id: args.p_application_id });
  if (!app) return null;
  const log = Array.isArray(app.activity_log) ? app.activity_log : [];
  await db
    .collection('membership_applications')
    .updateOne({ _id: app._id }, { $set: { activity_log: [...log, entry], updated_at: new Date() } });
  return null;
}

/** Activity start as a Date, from `activity_date` + `start_time`. */
async function activityStart(db: Db, id: string): Promise<{ activity: Row; start: Date } | null> {
  const activity = await db.collection('activities').findOne({ id });
  if (!activity) return null;
  const start = new Date(`${activity.activity_date}T${activity.start_time ?? '00:00:00'}`);
  return { activity, start };
}

/** Ports of the Postgres functions the app calls through `.rpc()`. */
const FUNCTIONS: Record<string, RpcFn> = {
  get_user_role: (db, _args, caller) => roleOf(db, caller.userId),
  is_admin: async (db, _args, caller) => (await roleOf(db, caller.userId)) === 'admin',
  is_coach: async (db, _args, caller) => (await roleOf(db, caller.userId)) === 'coach',
  is_athlete: async (db, _args, caller) => (await roleOf(db, caller.userId)) === 'athlete',
  get_user_club_id: async (db, _args, caller) =>
    caller.userId ? ((await db.collection('profiles').findOne({ id: caller.userId }))?.club_id ?? null) : null,

  add_activity_log: (db, args) => addActivityLog(db, args),

  update_application_status: async (db, args) => {
    const app = await db.collection('membership_applications').findOne({ id: args.p_application_id });
    const now = new Date();
    await db.collection('membership_applications').updateOne(
      { id: args.p_application_id },
      {
        $set: {
          status: args.p_new_status,
          review_info: {
            reviewed_by: args.p_reviewed_by,
            reviewed_at: now.toISOString(),
            reviewer_role: await reviewerRole(db, args.p_reviewed_by),
            notes: args.p_notes ?? null,
          },
          updated_at: now,
        },
      }
    );
    await addActivityLog(db, {
      p_application_id: args.p_application_id,
      p_action: 'status_changed',
      p_by_user: args.p_reviewed_by,
      p_details: { from: app?.status ?? null, to: args.p_new_status, notes: args.p_notes ?? null },
    });
    return null;
  },

  check_duplicate_pending_application: async (db, args) => {
    const pending = await db
      .collection('membership_applications')
      .findOne({ user_id: args.p_user_id, status: 'pending' });
    return [
      pending
        ? {
            has_pending: true,
            pending_application_id: pending.id,
            pending_club_id: pending.club_id,
            pending_since: new Date(pending.created_at).toISOString(),
          }
        : { has_pending: false, pending_application_id: null, pending_club_id: null, pending_since: null },
    ];
  },

  update_feature_flag: async (db, args) => {
    const set: Row = { updated_at: new Date() };
    if (args.flag_enabled !== null && args.flag_enabled !== undefined) set.enabled = args.flag_enabled;
    if (args.flag_rollout !== null && args.flag_rollout !== undefined) set.rollout_percentage = args.flag_rollout;
    const flag = await db
      .collection('feature_flags')
      .findOneAndUpdate({ name: args.flag_name }, { $set: set }, { returnDocument: 'after' });
    if (!flag) return null;
    return {
      id: flag.id ?? null,
      name: flag.name,
      enabled: flag.enabled,
      rollout_percentage: flag.rollout_percentage,
      updated_at: new Date(flag.updated_at).toISOString(),
    };
  },

  get_system_setting: async (db, args) =>
    (await db.collection('system_settings').findOne({ setting_key: args.p_key }))?.setting_value ?? null,

  update_system_setting: async (db, args) => {
    const now = new Date();
    await db.collection('system_settings').updateOne(
      { setting_key: args.p_key },
      {
        $set: { setting_value: args.p_value, updated_by: args.p_updated_by, updated_at: now },
        $setOnInsert: { id: crypto.randomUUID(), created_at: now },
      },
      { upsert: true }
    );
    return null;
  },

  cleanup_old_idempotency_keys: async (db) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { deletedCount } = await db.collection('idempotency_keys').deleteMany({ created_at: { $lt: cutoff } });
    return deletedCount;
  },

  get_device_statistics: async (db, args) => {
    const match = args.p_user_id ? { user_id: args.p_user_id } : {};
    const rows = await db
      .collection('login_sessions')
      .aggregate([
        { $match: { ...match, device_id: { $ne: null } } },
        { $group: { _id: '$device_id', login_count: { $sum: 1 }, last_login: { $max: '$login_at' } } },
        { $sort: { last_login: -1 } },
      ])
      .toArray();
    return rows.map((r) => ({
      device_id: r._id,
      login_count: r.login_count,
      last_login: r.last_login ? new Date(r.last_login).toISOString() : null,
      check_in_count: 0,
    }));
  },

  generate_activity_qr_token: async (db, args) => {
    const token = createHash('sha256')
      .update(`${args.p_activity_id}${Date.now()}${randomBytes(16).toString('hex')}`)
      .digest('hex');
    await db.collection('activities').updateOne(
      { id: args.p_activity_id },
      {
        $set: {
          qr_code_token: token,
          qr_code_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          updated_at: new Date(),
        },
      }
    );
    return token;
  },

  is_activity_full: async (db, args) => {
    const activity = await db.collection('activities').findOne({ id: args.p_activity_id });
    if (!activity || activity.max_participants === null || activity.max_participants === undefined) return false;
    const approved = await db
      .collection('activity_registrations')
      .countDocuments({ activity_id: args.p_activity_id, status: 'approved' });
    return approved >= activity.max_participants;
  },

  is_checkin_window_valid: async (db, args) => {
    const found = await activityStart(db, args.p_activity_id);
    if (!found) return false;
    const at = args.p_checkin_time ? new Date(args.p_checkin_time) : new Date();
    const before = Number(found.activity.checkin_window_before ?? 30) * 60_000;
    const after = Number(found.activity.checkin_window_after ?? 15) * 60_000;
    return at.getTime() >= found.start.getTime() - before && at.getTime() <= found.start.getTime() + after;
  },

  determine_checkin_status: async (db, args) => {
    const found = await activityStart(db, args.p_activity_id);
    if (!found) return 'absent';
    const at = args.p_checkin_time ? new Date(args.p_checkin_time) : new Date();
    return at <= found.start ? 'on_time' : 'late';
  },
};

export async function executeRpc(db: Db, fn: string, args: Row | undefined, caller: Caller): Promise<DbResult> {
  const impl = FUNCTIONS[fn];
  if (!impl) {
    return {
      data: null,
      error: dbError(`Could not find the function public.${fn} in the schema cache`, 'PGRST202'),
      count: null,
      status: 404,
      statusText: 'Not Found',
    };
  }
  try {
    return ok(await impl(db, args ?? {}, caller));
  } catch (error) {
    return {
      data: null,
      error: dbError((error as Error).message ?? 'Function failed', 'P0001'),
      count: null,
      status: 400,
      statusText: 'Error',
    };
  }
}
