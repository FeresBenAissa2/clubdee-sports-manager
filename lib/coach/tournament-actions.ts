'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import { getCoachAccess, type CoachAccess } from './session-access';
import { localDateKey } from '@/lib/utils/local-date';

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped query client */

type Db = Awaited<ReturnType<typeof createClient>>;

type ParticipantStatus = 'selected' | 'waiting' | 'confirmed' | 'declined';
const PARTICIPANT_STATUSES: ParticipantStatus[] = ['selected', 'waiting', 'confirmed', 'declined'];
const TOURNAMENT_STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled'];

/** Statuses that take one of the tournament's places. */
const TAKES_A_PLACE: ParticipantStatus[] = ['selected', 'confirmed'];

interface TournamentInput {
  name: string;
  sport_type: string;
  location?: string;
  notes?: string;
  max_participants?: number;
  start_date: string;
  end_date: string;
  /** Which of the coach's clubs organises the tournament (defaults to the first one). */
  club_id?: string;
}

/**
 * Who is asking. Tournaments belong to a club; a coach manages the tournaments of
 * every club they coach, an admin manages all of them.
 */
async function requireCoach(): Promise<{ db: Db; userId: string; access: CoachAccess } | { error: string }> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const access = await getCoachAccess(db, user.id);
  if (!access) return { error: 'Only coaches can manage tournaments' };
  return { db, userId: user.id, access };
}

/** The tournament, if the caller may manage it. */
async function manageableTournament(db: Db, access: CoachAccess, tournamentId: string): Promise<any | null> {
  const { data: tournament } = await (db as any).from('tournaments').select('*').eq('id', tournamentId).maybeSingle();
  if (!tournament) return null;
  return access.isAdmin || access.clubIds.includes(tournament.club_id) ? tournament : null;
}

/**
 * Status to show. Nothing updates the stored status as days pass, so an "upcoming"
 * tournament would stay upcoming forever: derive it from the dates instead. A
 * tournament the coach cancelled or closed by hand keeps that status.
 */
function effectiveStatus(tournament: { status?: string; start_date?: unknown; end_date?: unknown }): string {
  if (tournament.status === 'cancelled' || tournament.status === 'completed') return tournament.status;
  const day = (value: unknown) => (value ? localDateKey(new Date(value as string)) : null);
  const today = localDateKey();
  const start = day(tournament.start_date);
  const end = day(tournament.end_date) ?? start;
  if (end && today > end) return 'completed';
  if (start && today >= start) return 'ongoing';
  return 'upcoming';
}

/** Checks the fields of a tournament; returns a message for the first problem found. */
function validateTournament(data: Partial<TournamentInput>, requireAll: boolean): string | null {
  if (requireAll || data.name !== undefined) {
    const name = (data.name ?? '').trim();
    if (name.length < 3) return 'Tournament name must be at least 3 characters';
    if (name.length > 200) return 'Tournament name must be at most 200 characters';
  }
  if (requireAll || data.sport_type !== undefined) {
    if (!(data.sport_type ?? '').trim()) return 'Sport type is required';
  }
  if (requireAll || data.start_date !== undefined) {
    if (!data.start_date || Number.isNaN(Date.parse(data.start_date))) return 'Start date is not valid';
  }
  if (requireAll || data.end_date !== undefined) {
    if (!data.end_date || Number.isNaN(Date.parse(data.end_date))) return 'End date is not valid';
  }
  if (data.start_date && data.end_date && Date.parse(data.end_date) < Date.parse(data.start_date)) {
    return 'End date must be on or after the start date';
  }
  if (data.max_participants !== undefined && data.max_participants !== null) {
    if (!Number.isInteger(data.max_participants) || data.max_participants < 1) {
      return 'Maximum participants must be a whole number of 1 or more';
    }
  }
  return null;
}

// Get tournaments of the coach's clubs
export async function getCoachTournaments() {
  const ctx = await requireCoach();
  if ('error' in ctx) return { error: ctx.error };
  const { db, access } = ctx;

  let query = (db as any)
    .from('tournaments')
    .select(
      `
      *,
      tournament_participants(count)
    `
    )
    .order('start_date', { ascending: false });
  if (!access.isAdmin) query = query.in('club_id', access.clubIds);

  const { data, error } = await query;
  if (error) return { error: error.message };

  const clubName = new Map(access.clubs.map((club) => [club.id, club.name]));
  const tournaments = (data ?? []).map((tournament: any) => ({
    ...tournament,
    status: effectiveStatus(tournament),
    // The screens read `tournament_type`; older rows only have it, newer ones have `sport_type`.
    tournament_type: tournament.tournament_type ?? tournament.sport_type,
    club_name: access.clubs.length > 1 ? clubName.get(tournament.club_id) : undefined,
  }));
  return { tournaments };
}

// Get tournament details with participants
export async function getTournamentDetails(tournamentId: string) {
  const ctx = await requireCoach();
  if ('error' in ctx) return { error: ctx.error };
  const { db, access } = ctx;

  const tournament = await manageableTournament(db, access, tournamentId);
  if (!tournament) return { error: 'Tournament not found' };

  const { data: rows, error: participantsError } = await (db as any)
    .from('tournament_participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('added_at', { ascending: true });
  if (participantsError) return { error: participantsError.message };

  // Participants are stored by user id; show the athlete's real name from the athletes table.
  const userIds = (rows ?? []).map((row: any) => row.athlete_id);
  const { data: athletes } = userIds.length
    ? await db.from('athletes').select('user_id, first_name, last_name, email, profile_picture_url').in('user_id', userIds)
    : { data: [] };
  const athleteByUser = new Map(((athletes ?? []) as any[]).map((a) => [a.user_id, a]));

  const participants = (rows ?? []).map((row: any) => {
    const athlete = athleteByUser.get(row.athlete_id);
    return {
      ...row,
      athlete: {
        id: row.athlete_id,
        full_name: athlete ? `${athlete.first_name ?? ''} ${athlete.last_name ?? ''}`.trim() || 'Athlete' : 'Former athlete',
        email: athlete?.email ?? '',
        profile_picture_url: athlete?.profile_picture_url ?? null,
      },
    };
  });

  return {
    tournament: {
      ...tournament,
      status: effectiveStatus(tournament),
      tournament_type: tournament.tournament_type ?? tournament.sport_type,
    },
    participants,
  };
}

// Create tournament
export async function createTournament(data: TournamentInput) {
  const ctx = await requireCoach();
  if ('error' in ctx) return { error: ctx.error };
  const { db, userId, access } = ctx;

  const clubId = data.club_id || access.clubIds[0];
  if (!clubId || !access.clubIds.includes(clubId)) {
    return { error: 'You can only create tournaments for your own clubs' };
  }

  const problem = validateTournament(data, true);
  if (problem) return { error: problem };

  const sportType = data.sport_type.trim();
  const { data: tournament, error } = await (db as any)
    .from('tournaments')
    .insert({
      club_id: clubId,
      created_by: userId,
      name: data.name.trim(),
      sport_type: sportType,
      tournament_type: sportType,
      location: data.location?.trim() || null,
      notes: data.notes?.trim() || null,
      max_participants: data.max_participants ?? null,
      start_date: data.start_date,
      end_date: data.end_date,
      status: 'upcoming',
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/coach/tournaments');
  return { tournament };
}

// Update tournament
export async function updateTournament(tournamentId: string, data: Partial<TournamentInput> & { status?: string }) {
  const ctx = await requireCoach();
  if ('error' in ctx) return { error: ctx.error };
  const { db, access } = ctx;

  const current = await manageableTournament(db, access, tournamentId);
  if (!current) return { error: 'Tournament not found' };

  const problem = validateTournament(
    {
      ...data,
      // Compare a changed date against the stored one.
      start_date: data.start_date ?? (data.end_date !== undefined ? current.start_date : undefined),
      end_date: data.end_date ?? (data.start_date !== undefined ? current.end_date : undefined),
    },
    false
  );
  if (problem) return { error: problem };
  if (data.status !== undefined && !TOURNAMENT_STATUSES.includes(data.status)) {
    return { error: 'Unknown tournament status' };
  }

  // Only these fields can be edited; the club and the author never change here.
  const changes: Record<string, unknown> = {};
  if (data.name !== undefined) changes.name = data.name.trim();
  if (data.sport_type !== undefined) {
    changes.sport_type = data.sport_type.trim();
    changes.tournament_type = data.sport_type.trim();
  }
  if (data.location !== undefined) changes.location = data.location?.trim() || null;
  if (data.notes !== undefined) changes.notes = data.notes?.trim() || null;
  if (data.max_participants !== undefined) changes.max_participants = data.max_participants ?? null;
  if (data.start_date !== undefined) changes.start_date = data.start_date;
  if (data.end_date !== undefined) changes.end_date = data.end_date;
  if (data.status !== undefined) changes.status = data.status;
  if (Object.keys(changes).length === 0) return { tournament: current };

  const { data: tournament, error } = await (db as any)
    .from('tournaments')
    .update(changes)
    .eq('id', tournamentId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/coach/tournaments');
  revalidatePath(`/dashboard/coach/tournaments/${tournamentId}`);
  return { tournament };
}

// Delete tournament
export async function deleteTournament(tournamentId: string) {
  const ctx = await requireCoach();
  if ('error' in ctx) return { error: ctx.error };
  const { db, access } = ctx;

  if (!(await manageableTournament(db, access, tournamentId))) return { error: 'Tournament not found' };

  const { error } = await (db as any).from('tournaments').delete().eq('id', tournamentId);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/coach/tournaments');
  return { success: true };
}

// Get the athletes of the tournament's club, with their status in this tournament
export async function getAvailableAthletes(tournamentId: string) {
  const ctx = await requireCoach();
  if ('error' in ctx) return { error: ctx.error };
  const { db, access } = ctx;

  const tournament = await manageableTournament(db, access, tournamentId);
  if (!tournament) return { error: 'Tournament not found' };

  const { data: athletes, error } = await db
    .from('athletes')
    .select('user_id, first_name, last_name, email, profile_picture_url')
    .eq('club_id', tournament.club_id)
    .order('first_name');
  if (error) return { error: error.message };

  const { data: participants } = await (db as any)
    .from('tournament_participants')
    .select('athlete_id, status')
    .eq('tournament_id', tournamentId);
  const statusOf = new Map(((participants ?? []) as any[]).map((p) => [p.athlete_id, p.status]));

  const athletesWithStatus = ((athletes ?? []) as any[]).map((athlete) => ({
    // Participants are keyed by the athlete's user id.
    id: athlete.user_id as string,
    full_name: `${athlete.first_name ?? ''} ${athlete.last_name ?? ''}`.trim() || 'Athlete',
    email: (athlete.email ?? '') as string,
    profile_picture_url: (athlete.profile_picture_url ?? null) as string | null,
    participantStatus: (statusOf.get(athlete.user_id) ?? null) as string | null,
  }));

  return { athletes: athletesWithStatus };
}

/** How many places are already taken in a tournament. */
async function placesTaken(db: Db, tournamentId: string, exceptAthleteId?: string): Promise<number> {
  const { data } = await (db as any)
    .from('tournament_participants')
    .select('athlete_id, status')
    .eq('tournament_id', tournamentId)
    .in('status', TAKES_A_PLACE);
  return ((data ?? []) as any[]).filter((row) => row.athlete_id !== exceptAthleteId).length;
}

// Add athlete to tournament
export async function addAthleteToTournament(
  tournamentId: string,
  athleteId: string,
  status: 'selected' | 'waiting' = 'selected',
  coachNotes?: string
) {
  const ctx = await requireCoach();
  if ('error' in ctx) return { error: ctx.error };
  const { db, userId, access } = ctx;

  const tournament = await manageableTournament(db, access, tournamentId);
  if (!tournament) return { error: 'Tournament not found' };
  if (status !== 'selected' && status !== 'waiting') return { error: 'Unknown participant status' };

  // Only athletes of the organising club can take part.
  const { data: athlete } = await db
    .from('athletes')
    .select('id')
    .eq('user_id', athleteId)
    .eq('club_id', tournament.club_id)
    .maybeSingle();
  if (!athlete) return { error: 'This athlete is not a member of the tournament\'s club' };

  const { data: existing } = await (db as any)
    .from('tournament_participants')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('athlete_id', athleteId)
    .maybeSingle();
  if (existing) return { error: 'This athlete is already on the tournament list' };

  if (status === 'selected' && tournament.max_participants) {
    if ((await placesTaken(db, tournamentId)) >= tournament.max_participants) {
      return { error: 'The tournament is full. Add the athlete to the waiting list instead.' };
    }
  }

  const { data, error } = await (db as any)
    .from('tournament_participants')
    .insert({
      tournament_id: tournamentId,
      athlete_id: athleteId,
      status,
      added_by: userId,
      coach_notes: coachNotes?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/coach/tournaments/${tournamentId}`);
  return { participant: data };
}

// Remove athlete from tournament
export async function removeAthleteFromTournament(tournamentId: string, athleteId: string) {
  const ctx = await requireCoach();
  if ('error' in ctx) return { error: ctx.error };
  const { db, access } = ctx;

  if (!(await manageableTournament(db, access, tournamentId))) return { error: 'Tournament not found' };

  const { error } = await (db as any)
    .from('tournament_participants')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('athlete_id', athleteId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/coach/tournaments/${tournamentId}`);
  return { success: true };
}

// Update participant status
export async function updateParticipantStatus(
  tournamentId: string,
  athleteId: string,
  status: ParticipantStatus,
  coachNotes?: string
) {
  const ctx = await requireCoach();
  if ('error' in ctx) return { error: ctx.error };
  const { db, access } = ctx;

  const tournament = await manageableTournament(db, access, tournamentId);
  if (!tournament) return { error: 'Tournament not found' };
  if (!PARTICIPANT_STATUSES.includes(status)) return { error: 'Unknown participant status' };

  // Moving someone onto the team must respect the number of places.
  if (TAKES_A_PLACE.includes(status) && tournament.max_participants) {
    if ((await placesTaken(db, tournamentId, athleteId)) >= tournament.max_participants) {
      return { error: 'The tournament is full. Remove or move another athlete first.' };
    }
  }

  const updateData: Record<string, unknown> = { status };
  if (coachNotes !== undefined) updateData.coach_notes = coachNotes.trim() || null;

  const { data, error } = await (db as any)
    .from('tournament_participants')
    .update(updateData)
    .eq('tournament_id', tournamentId)
    .eq('athlete_id', athleteId)
    .select()
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: 'This athlete is not on the tournament list' };

  revalidatePath(`/dashboard/coach/tournaments/${tournamentId}`);
  return { participant: data };
}
