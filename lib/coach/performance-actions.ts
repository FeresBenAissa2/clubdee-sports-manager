'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';

export interface PerformanceRecordInput {
  athleteId: string;
  testType: string;
  testName: string;
  score: number;
  unit: string;
  testDate: string;
  notes?: string;
}

export async function createPerformanceRecord(data: PerformanceRecordInput) {
  const db = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get coach profile
  const { data: coach, error: coachError } = await db
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle() as any;

  if (coachError || !coach) {
    return { success: false, error: 'Coach profile not found' };
  }

  // Verify athlete belongs to coach's club
  const { data: athlete, error: athleteError } = await db
    .from('athletes')
    .select('id, club_id')
    .eq('id', data.athleteId)
    .maybeSingle() as any;

  if (athleteError || !athlete) {
    return { success: false, error: 'Athlete not found' };
  }

  if (athlete.club_id !== coach.club_id) {
    return { success: false, error: 'Cannot record performance for athletes from other clubs' };
  }

  // Create performance record
  const { data: record, error: insertError } = await db
    .from('performance_records')
    .insert({
      athlete_id: data.athleteId,
      coach_id: coach.id,
      test_type: data.testType,
      test_name: data.testName,
      score: data.score,
      unit: data.unit,
      test_date: data.testDate,
      notes: data.notes || null,
    } as any)
    .select()
    .single();

  if (insertError) {
    console.error('Error creating performance record:', insertError);
    return { success: false, error: 'Failed to create performance record' };
  }

  revalidatePath('/dashboard/coach/performance');
  revalidatePath('/dashboard/athlete/performance');

  return { success: true, data: record };
}

export async function getCoachAthletes() {
  const db = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', data: [] };
  }

  // Get coach profile
  const { data: coach, error: coachError } = await db
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle() as any;

  if (coachError || !coach) {
    return { success: false, error: 'Coach profile not found', data: [] };
  }

  // Get athletes in coach's club
  const { data: athletes, error: athletesError } = await db
    .from('athletes')
    .select('id, first_name, last_name, nickname')
    .eq('club_id', coach.club_id)
    .order('first_name') as any;

  if (athletesError) {
    console.error('Error fetching athletes:', athletesError);
    return { success: false, error: 'Failed to fetch athletes', data: [] };
  }

  return { success: true, data: athletes || [] };
}

export async function getPerformanceRecords(athleteId?: string) {
  const db = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', data: [] };
  }

  // Get coach profile
  const { data: coach, error: coachError } = await db
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle() as any;

  if (coachError || !coach) {
    return { success: false, error: 'Coach profile not found', data: [] };
  }

  // Build query
  let query = db
    .from('performance_records')
    .select(`
      *,
      athletes (
        id,
        first_name,
        last_name,
        nickname,
        club_id
      )
    `)
    .order('test_date', { ascending: false });

  // Filter by athlete if specified
  if (athleteId) {
    query = query.eq('athlete_id', athleteId);
  }

  const { data: records, error: recordsError } = await query;

  if (recordsError) {
    console.error('Error fetching performance records:', recordsError);
    return { success: false, error: 'Failed to fetch performance records', data: [] };
  }

  // Filter to only include athletes from coach's club (RLS should handle this, but double-check)
  const filteredRecords = (records || []).filter(
    (record: any) => record.athletes?.club_id === coach.club_id
  );

  return { success: true, data: filteredRecords };
}
