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
    insert: { roles: ['admin'], own: 'user_id' },
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
    insert: { roles: STAFF, own: 'user_id' },
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
  announcements: { select: 'auth', ...STAFF_WRITE },
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
  feature_flags: { select: 'public' },
  system_settings: { select: 'public' },
};

function ruleFor(table: string, action: Action): Rule {
  return POLICIES[table]?.[action] ?? 'auth';
}

/**
 * Row filter a caller is limited to: `null` means every row, `false` means none
 * (reads come back empty and updates/deletes touch nothing, like Postgres RLS).
 */
export function rowFilter(table: string, action: Action, caller: Caller): Filter<Document> | null | false {
  if (caller.service) return null;
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
