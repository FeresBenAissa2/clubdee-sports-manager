import type { QueryClient } from '@/lib/db/query/builder';

export type CoachRow = {
  id: string;
  user_id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  clubs?: { id: string; name: string } | null;
};

/**
 * A coach may be linked to several clubs (multiple rows in `coaches`).
 * Never use .single() on user_id — use this helper instead.
 */
export async function getCoachProfilesForUser(
  db: QueryClient,
  userId: string
): Promise<{ profiles: CoachRow[]; error: string | null }> {
  const { data, error } = await db
    .from('coaches')
    .select(
      `
      id,
      user_id,
      club_id,
      first_name,
      last_name,
      email,
      phone_number,
      clubs (id, name)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    return { profiles: [], error: error.message };
  }

  return { profiles: (data || []) as CoachRow[], error: null };
}

/** Primary coach row (first club assignment) for dashboard stats / default club. */
export async function getPrimaryCoachProfile(
  db: QueryClient,
  userId: string
): Promise<{ profile: CoachRow | null; clubIds: string[]; error: string | null }> {
  const { profiles, error } = await getCoachProfilesForUser(db, userId);
  if (error) return { profile: null, clubIds: [], error };
  if (profiles.length === 0) return { profile: null, clubIds: [], error: null };

  return {
    profile: profiles[0],
    clubIds: profiles.map((p) => p.club_id),
    error: null,
  };
}
