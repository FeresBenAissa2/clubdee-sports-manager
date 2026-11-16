import type { Filter, Document } from 'mongodb';
import type { AppRole, Row } from './types';

/** Who is running a query. Server code that needs full access uses the service context. */
export interface Caller {
  service: boolean;
  userId: string | null;
  role: AppRole | null;
}

type Action = 'select' | 'insert' | 'update' | 'delete';

/**
 * - `public`: anyone, signed in or not
 * - `auth`: any signed-in user
 * - object: admins, the listed roles, or rows whose `own` column is the caller
 */
type Rule = 'public' | 'auth' | { roles?: AppRole[]; own?: string };

const STAFF: AppRole[] = ['admin', 'coach'];
const ADMIN_ONLY: Rule = { roles: ['admin'] };
const STAFF_WRITE = { insert: { roles: STAFF }, update: { roles: STAFF }, delete: { roles: STAFF } };

/** Mirrors the row-level security policies from scripts/FULL_SETUP.sql. */
const POLICIES: Record<string, Partial<Record<Action, Rule>>> = {
  clubs: { select: 'public', insert: ADMIN_ONLY, update: ADMIN_ONLY, delete: ADMIN_ONLY },
  sports: { select: 'public', insert: ADMIN_ONLY, update: ADMIN_ONLY, delete: ADMIN_ONLY },
  coaches: {
    select: 'public',
    // Only an admin links a coach to a club; a self-insert would let anyone become a coach.
    insert: ADMIN_ONLY,
    update: { roles: ['admin'], own: 'user_id' },
    delete: ADMIN_ONLY,
  },
  user_roles: {
    select: { roles: ['admin'], own: 'user_id' },
    insert: { roles: ['admin'], own: 'user_id' },
    update: ADMIN_ONLY,
    delete: ADMIN_ONLY,
  },
  profiles: {
    select: 'auth',
    insert: { roles: ['admin'], own: 'id' },
    update: { roles: STAFF, own: 'id' },
    delete: ADMIN_ONLY,
  },
  athletes: {
    select: 'auth',
    // Created by staff when an application is approved; a self-insert would skip approval.
    insert: { roles: STAFF },
    update: { roles: STAFF, own: 'user_id' },
    delete: ADMIN_ONLY,
  },
  membership_applications: {
    select: { roles: STAFF, own: 'user_id' },
    insert: { own: 'user_id' },
    update: { roles: STAFF, own: 'user_id' },
    delete: ADMIN_ONLY,
  },
  training_sessions: { select: 'auth', ...STAFF_WRITE },
  attendance: { select: 'auth', ...STAFF_WRITE },
  performance_records: { select: 'auth', ...STAFF_WRITE },
  // Staff post announcements; only the author (or an admin) may change or remove one.
  announcements: {
    select: 'auth',
    insert: { roles: STAFF },
    update: { roles: ['admin'], own: 'created_by' },
    delete: { roles: ['admin'], own: 'created_by' },
  },
  tournaments: { select: 'auth', ...STAFF_WRITE },
  announcement_reads: {
    select: 'auth',
    insert: { roles: STAFF, own: 'user_id' },
    update: { roles: STAFF, own: 'user_id' },
    delete: { roles: STAFF, own: 'user_id' },
  },
  tournament_participants: {
    select: 'auth',
    insert: { roles: STAFF, own: 'athlete_id' },
    update: { roles: STAFF, own: 'athlete_id' },
    delete: { roles: STAFF, own: 'athlete_id' },
  },
  login_sessions: {
    select: { roles: ['admin'], own: 'user_id' },
    insert: { roles: ['admin'], own: 'user_id' },
    update: { roles: ['admin'], own: 'user_id' },
    delete: { roles: ['admin'], own: 'user_id' },
  },
  feature_flags: { select: 'public', insert: ADMIN_ONLY, update: ADMIN_ONLY, delete: ADMIN_ONLY },
  system_settings: { select: 'public', insert: ADMIN_ONLY, update: ADMIN_ONLY, delete: ADMIN_ONLY },
  // Anyone signed in may add a log line; only admins read or change the logs.
  audit_logs: { select: ADMIN_ONLY, insert: 'auth', update: ADMIN_ONLY, delete: ADMIN_ONLY },
  error_logs: { select: ADMIN_ONLY, insert: 'auth', update: ADMIN_ONLY, delete: ADMIN_ONLY },
  idempotency_keys: {
    select: { roles: ['admin'], own: 'user_id' },
    insert: { roles: ['admin'], own: 'user_id' },
    update: { roles: ['admin'], own: 'user_id' },
    delete: { roles: ['admin'], own: 'user_id' },
  },
  push_subscriptions: {
    select: { roles: ['admin'], own: 'user_id' },
    insert: { roles: ['admin'], own: 'user_id' },
    update: { roles: ['admin'], own: 'user_id' },
    delete: { roles: ['admin'], own: 'user_id' },
  },
};

/**
 * Collections that hold credentials or private data and are never reachable through
 * the query client (and therefore not through /api/db either). Server code reads
 * them with the MongoDB driver or the service client after its own checks.
 */
const SERVICE_ONLY = new Set([
  'users',
  'parent_users',
  'parent_sessions',
  'parent_password_resets',
  'nutrition_hydration',
  'nutrition_meals',
  'nutrition_checkins',
]);

/**
 * Columns that decide who someone is or what they may access. Row policies let people
 * edit their own rows, so without this an athlete could make themselves an admin, mark
 * their own membership as active or move themselves to another club.
 *
 * `roles` may set the column freely (admins always can). Everyone else may only leave
 * it unchanged or set one of `selfValues`.
 */
interface ColumnRule {
  roles: AppRole[];
  selfValues?: unknown[];
}

const PROTECTED_COLUMNS: Record<string, Record<string, ColumnRule>> = {
  profiles: {
    role: { roles: [], selfValues: ['athlete'] },
    membership_status: { roles: STAFF, selfValues: ['pending'] },
    club_id: { roles: STAFF },
    coach_id: { roles: STAFF },
  },
  user_roles: {
    role: { roles: [], selfValues: ['athlete'] },
  },
  athletes: {
    club_id: { roles: STAFF },
    user_id: { roles: STAFF },
  },
  coaches: {
    club_id: { roles: [] },
    user_id: { roles: [] },
  },
  membership_applications: {
    status: { roles: STAFF, selfValues: ['pending'] },
    review_info: { roles: STAFF },
    profile_id: { roles: STAFF },
  },
};

const sameValue = (a: unknown, b: unknown) => a === b || ((a === null || a === undefined) && (b === null || b === undefined));

/**
 * Name of the first protected column `values` tries to set that the caller may not
 * set, or null when the write is fine. Pass `existing` for updates so that sending
 * back an unchanged value is not treated as a change.
 */
export function columnViolation(table: string, caller: Caller, values: Row, existing?: Row): string | null {
  if (caller.service || caller.role === 'admin') return null;
  const rules = PROTECTED_COLUMNS[table];
  if (!rules) return null;
  for (const [column, rule] of Object.entries(rules)) {
    const value = values[column];
    if (value === undefined) continue;
    if (caller.role && rule.roles.includes(caller.role)) continue;
    if (existing ? sameValue(existing[column], value) : value === null) continue;
    if (rule.selfValues?.some((allowed) => sameValue(allowed, value))) continue;
    return column;
  }
  return null;
}

/** True when `row` is one the caller could reach with the given filter from `rowFilter`. */
export function rowAllowed(filter: Filter<Document> | null | false, row: Row): boolean {
  if (filter === null) return true;
  if (filter === false) return false;
  return Object.entries(filter).every(([column, value]) => row[column] === value);
}

function ruleFor(table: string, action: Action): Rule {
  return POLICIES[table]?.[action] ?? 'auth';
}

/**
 * Row filter a caller is limited to: `null` means every row, `false` means none
 * (reads come back empty and updates/deletes touch nothing, like Postgres RLS).
 */
export function rowFilter(table: string, action: Action, caller: Caller): Filter<Document> | null | false {
  if (caller.service) return null;
  if (SERVICE_ONLY.has(table)) return false;
  const rule = ruleFor(table, action);
  if (rule === 'public') return null;
  if (!caller.userId) return false;
  if (rule === 'auth' || caller.role === 'admin') return null;
  if (caller.role && rule.roles?.includes(caller.role)) return null;
  if (rule.own) return { [rule.own]: caller.userId };
  return false;
}

/** WITH CHECK for inserted rows. */
export function canInsert(table: string, caller: Caller, row: Row): boolean {
  const filter = rowFilter(table, 'insert', caller);
  if (filter === null) return true;
  if (filter === false) return false;
  return Object.entries(filter).every(([column, value]) => row[column] === value);
}
