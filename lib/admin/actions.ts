'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import { deleteNutritionData } from '@/lib/nutrition/data';
import { localDateKey } from '@/lib/utils/local-date';

export interface DashboardStats {
  totalUsers: number;
  totalClubs: number;
  totalAthletes: number;
  totalCoaches: number;
  recentActivities: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const db = await createClient();

    // Get total clubs
    const { count: clubsCount } = await db
      .from('clubs')
      .select('*', { count: 'exact', head: true });

    // Get total athletes
    const { count: athletesCount } = await db
      .from('athletes')
      .select('*', { count: 'exact', head: true });

    // Get total coaches
    const { count: coachesCount } = await db
      .from('coaches')
      .select('*', { count: 'exact', head: true });

    // Get recent training sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: sessionsCount } = await db
      .from('training_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('session_date', localDateKey(thirtyDaysAgo));

    return {
      totalUsers: (athletesCount || 0) + (coachesCount || 0),
      totalClubs: clubsCount || 0,
      totalAthletes: athletesCount || 0,
      totalCoaches: coachesCount || 0,
      recentActivities: sessionsCount || 0,
    };
  } catch {
    return {
      totalUsers: 0,
      totalClubs: 0,
      totalAthletes: 0,
      totalCoaches: 0,
      recentActivities: 0,
    };
  }
}

export async function getAllClubs() {
  try {
    const db = await createClient();

    const { data, error } = await db
      .from('clubs')
      .select('*')
      .order('name');

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clubs',
    };
  }
}

/** Trims club fields and rejects empty values or a name another club already uses. */
async function checkClubInput(
  db: Awaited<ReturnType<typeof createClient>>,
  name: string,
  sportType: string,
  ignoreId?: string
): Promise<{ name: string; sportType: string } | { error: string }> {
  const cleanName = (name ?? '').trim().replace(/\s+/g, ' ');
  const cleanSport = (sportType ?? '').trim().replace(/\s+/g, ' ');
  if (!cleanName) return { error: 'Club name is required' };
  if (!cleanSport) return { error: 'Sport type is required' };

  const { data: existing } = await db.from('clubs').select('id, name');
  const taken = ((existing ?? []) as { id: string; name: string }[]).some(
    (club) => club.id !== ignoreId && club.name.trim().toLowerCase() === cleanName.toLowerCase()
  );
  if (taken) return { error: `A club named "${cleanName}" already exists` };

  return { name: cleanName, sportType: cleanSport };
}

export async function createClub(name: string, sportType: string, description?: string) {
  try {
    const db = await createClient();

    const checked = await checkClubInput(db, name, sportType);
    if ('error' in checked) return { success: false, error: checked.error };

    const insertData: {
      name: string;
      sport_type: string;
      description?: string;
    } = {
      name: checked.name,
      sport_type: checked.sportType,
    };

    if (description?.trim()) {
      insertData.description = description.trim();
    }

    const { data, error } = await db
      .from('clubs')
      .insert(insertData as never)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/admin/clubs');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create club',
    };
  }
}

export async function updateClub(
  id: string,
  name: string,
  sportType: string,
  description?: string
) {
  try {
    const db = await createClient();

    const checked = await checkClubInput(db, name, sportType, id);
    if ('error' in checked) return { success: false, error: checked.error };

    // An emptied description must be saved as empty, not silently kept.
    const updateData: {
      name: string;
      sport_type: string;
      description: string | null;
    } = {
      name: checked.name,
      sport_type: checked.sportType,
      description: description?.trim() || null,
    };

    const { data, error } = await db
      .from('clubs')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/admin/clubs');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update club',
    };
  }
}

export async function deleteClub(id: string) {
  try {
    const db = await createClient();

    // Deleting a club also deletes its athletes, coaches, sessions and announcements.
    // Refuse while people are still attached, so no account is left without a club.
    const [{ count: athleteCount }, { count: coachCount }] = await Promise.all([
      db.from('athletes').select('*', { count: 'exact', head: true }).eq('club_id', id),
      db.from('coaches').select('*', { count: 'exact', head: true }).eq('club_id', id),
    ]);
    if ((athleteCount ?? 0) > 0 || (coachCount ?? 0) > 0) {
      return {
        success: false,
        error: `This club still has ${athleteCount ?? 0} athlete(s) and ${coachCount ?? 0} coach(es). Move or remove them before deleting the club.`,
      };
    }

    const { error } = await db.from('clubs').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/admin/clubs');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete club',
    };
  }
}

export async function getAllCoaches() {
  try {
    const db = await createClient();

    const { data, error } = await db
      .from('coaches')
      .select(
        `
        *,
        clubs (
          id,
          name,
          sport_type
        )
      `
      )
      .order('first_name');

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch coaches',
    };
  }
}

export async function assignCoachToClub(coachId: string, clubId: string) {
  try {
    const db = await createClient();

    const { data, error } = await db
      .from('coaches')
      .update({ club_id: clubId } as never)
      .eq('id', coachId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/admin/coaches');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign coach',
    };
  }
}

export async function getAllAthletes() {
  try {
    const db = await createClient();

    const { data, error } = await db
      .from('athletes')
      .select(
        `
        *,
        clubs (
          id,
          name,
          sport_type
        )
      `
      )
      .order('first_name');

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch athletes',
    };
  }
}

/**
 * Deletes a coach's or athlete's whole account (sign-in, profile, role and every
 * record that belongs to them). Removing only the coach/athlete row would leave an
 * account that can still sign in but has no profile.
 */
export async function deleteUser(userId: string, userType: 'athlete' | 'coach') {
  try {
    const db = await createClient();

    const {
      data: { user: currentUser },
    } = await db.auth.getUser();
    if (!currentUser) return { success: false, error: 'Please sign in again' };
    if (currentUser.id === userId) {
      return { success: false, error: 'You cannot delete your own account' };
    }

    const table = userType === 'athlete' ? 'athletes' : 'coaches';
    const { data: rows } = await db.from(table).select('id').eq('user_id', userId);
    if (!rows || rows.length === 0) {
      return { success: false, error: `This ${userType} no longer exists` };
    }

    // Admin-only: also removes the profile, role, club rows and their dependent data.
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    await deleteNutritionData(userId);

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/admin/coaches');
    revalidatePath('/dashboard/admin/athletes');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
}
