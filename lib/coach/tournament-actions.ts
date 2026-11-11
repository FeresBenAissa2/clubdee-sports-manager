'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';

// Get tournaments for coach's club
export async function getCoachTournaments() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('tournaments')
    .select(`
      *,
      tournament_participants(count)
    `)
    .order('start_date', { ascending: false });

  if (error) return { error: error.message };
  return { tournaments: data };
}

// Get tournament details with participants
export async function getTournamentDetails(tournamentId: string) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = db as any;

  const { data: tournament, error: tournamentError } = await sb
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (tournamentError) return { error: tournamentError.message };

  const { data: participants, error: participantsError } = await sb
    .from('tournament_participants')
    .select(`
      *,
      athlete:profiles!athlete_id(id, full_name, email, profile_picture_url)
    `)
    .eq('tournament_id', tournamentId);

  if (participantsError) return { error: participantsError.message };

  return { tournament, participants };
}

// Create tournament
export async function createTournament(data: {
  name: string;
  sport_type: string;
  location?: string;
  notes?: string;
  max_participants?: number;
  start_date: string;
  end_date: string;
}) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: profile } = await db
    .from('profiles')
    .select('club_id, role')
    .eq('id', user.id)
    .single<{ club_id: string | null; role: string }>();

  if (!profile || profile.role !== 'coach' || !profile.club_id) {
    return { error: 'Only coaches can create tournaments' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tournament, error } = await (db as any)
    .from('tournaments')
    .insert({
      club_id: profile.club_id,
      created_by: user.id,
      name: data.name,
      tournament_type: data.sport_type,
      location: data.location,
      notes: data.notes,
      max_participants: data.max_participants,
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateTournament(tournamentId: string, data: any) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tournament, error } = await (db as any)
    .from('tournaments')
    .update(data)
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
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('tournaments')
    .delete()
    .eq('id', tournamentId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/coach/tournaments');
  return { success: true };
}

// Get available athletes (from coach's club)
export async function getAvailableAthletes(tournamentId: string) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: profile } = await db
    .from('profiles')
    .select('club_id')
    .eq('id', user.id)
    .single<{ club_id: string | null }>();

  if (!profile?.club_id) return { error: 'Coach profile not found' };

  const { data: athletes, error } = await db
    .from('profiles')
    .select('id, full_name, email, profile_picture_url')
    .eq('club_id', profile.club_id)
    .eq('role', 'athlete')
    .order('full_name') as { data: { id: string; full_name: string; email: string; profile_picture_url: string | null }[] | null; error: unknown };

  if (error) return { error: String(error) };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: participants } = await (db as any)
    .from('tournament_participants')
    .select('athlete_id, status')
    .eq('tournament_id', tournamentId);

  const athletesWithStatus = (athletes || []).map((athlete: { id: string; full_name: string; email: string; profile_picture_url: string | null }) => ({
    ...athlete,
    participantStatus: participants?.find((p: { athlete_id: string; status: string }) => p.athlete_id === athlete.id)?.status || null,
  }));

  return { athletes: athletesWithStatus };
}

// Add athlete to tournament
export async function addAthleteToTournament(
  tournamentId: string,
  athleteId: string,
  status: 'selected' | 'waiting' = 'selected',
  coachNotes?: string
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('tournament_participants')
    .insert({
      tournament_id: tournamentId,
      athlete_id: athleteId,
      status,
      added_by: user.id,
      coach_notes: coachNotes,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/coach/tournaments/${tournamentId}`);
  return { participant: data };
}

// Remove athlete from tournament
export async function removeAthleteFromTournament(tournamentId: string, athleteId: string) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  status: 'selected' | 'waiting' | 'confirmed' | 'declined',
  coachNotes?: string
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { status };
  if (coachNotes !== undefined) updateData.coach_notes = coachNotes;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('tournament_participants')
    .update(updateData)
    .eq('tournament_id', tournamentId)
    .eq('athlete_id', athleteId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/coach/tournaments/${tournamentId}`);
  return { participant: data };
}
