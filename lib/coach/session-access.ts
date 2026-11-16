import type { QueryClient } from '@/lib/db/query/builder';

/**
 * Who a coach is, for permission checks on training sessions and attendance.
 *
 * A coach can be linked to several clubs (one `coaches` row per club), and
 * `training_sessions.coach_id` stores the coach's *user* id. Comparing a session
 * with a single coach row therefore never matched; use these helpers instead.
 */
export interface CoachAccess {
  userId: string;
  /** Ids of the coach's rows in `coaches` (one per club). */
  coachIds: string[];
  clubIds: string[];
  clubs: { id: string; name: string }[];
  isAdmin: boolean;
}

export async function getCoachAccess(db: QueryClient, userId: string): Promise<CoachAccess | null> {
  const [{ data: rows }, { data: role }] = await Promise.all([
    db.from('coaches').select('id, club_id, clubs (id, name)').eq('user_id', userId).order('created_at', { ascending: true }),
    db.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
  ]);

  const coaches = (rows ?? []) as { id: string; club_id: string; clubs?: { id: string; name: string } | null }[];
  const isAdmin = (role as { role?: string } | null)?.role === 'admin';
  if (coaches.length === 0 && !isAdmin) return null;

  return {
    userId,
    coachIds: coaches.map((c) => c.id),
    clubIds: coaches.map((c) => c.club_id).filter(Boolean),
    clubs: coaches.map((c) => ({ id: c.club_id, name: c.clubs?.name ?? 'Club' })).filter((c) => c.id),
    isAdmin,
  };
}

/** True when the coach created the session or coaches the club it belongs to. */
export function canManageSession(
  access: CoachAccess,
  session: { coach_id?: string | null; club_id?: string | null; created_by?: string | null }
): boolean {
  if (access.isAdmin) return true;
  if (session.coach_id && (session.coach_id === access.userId || access.coachIds.includes(session.coach_id))) return true;
  if (session.created_by && session.created_by === access.userId) return true;
  return !!session.club_id && access.clubIds.includes(session.club_id);
}
