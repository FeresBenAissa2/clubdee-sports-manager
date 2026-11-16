'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import { localDateKey } from '@/lib/utils/local-date';

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

  // A coach has one row per club: record the result under the row of the athlete's club.
  const { data: clubCoach } = (await db
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .eq('club_id', athlete.club_id)
    .limit(1)
    .maybeSingle()) as { data: { id: string } | null };

  if (!clubCoach) {
    return { success: false, error: 'Cannot record performance for athletes from other clubs' };
  }

  // Validate the result itself (the form checks too, but the server must not trust it).
  const testType = String(data.testType ?? '').trim();
  const testName = String(data.testName ?? '').trim();
  const unit = String(data.unit ?? '').trim();
  const score = Number(data.score);
  if (!testType || !testName) {
    return { success: false, error: 'Test type and test name are required' };
  }
  if (!unit) {
    return { success: false, error: 'Unit is required' };
  }
  if (!Number.isFinite(score) || score < 0) {
    return { success: false, error: 'Score must be a number of 0 or more' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.testDate ?? '')) || Number.isNaN(Date.parse(data.testDate))) {
    return { success: false, error: 'Test date is not valid' };
  }
  if (data.testDate > localDateKey()) {
    return { success: false, error: 'Test date cannot be in the future' };
  }

  // Create performance record
  const { data: record, error: insertError } = await db
    .from('performance_records')
    .insert({
      athlete_id: data.athleteId,
      coach_id: clubCoach.id,
      test_type: testType,
      test_name: testName,
      score,
      unit,
      test_date: data.testDate,
      notes: data.notes?.trim() || null,
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

  // Get athletes of every club this coach belongs to
  const { data: coachRows } = (await db.from('coaches').select('club_id').eq('user_id', user.id)) as {
    data: { club_id: string }[] | null;
  };
  const clubIds = [...new Set((coachRows || []).map((row) => row.club_id))];
  const { data: athletes, error: athletesError } = await db
    .from('athletes')
    .select('id, first_name, last_name, nickname, club_id, clubs (name)')
    .in('club_id', clubIds)
    .order('first_name');

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

  // Only athletes of the coach's clubs (a coach can have several)
  const { data: coachRows } = (await db.from('coaches').select('club_id').eq('user_id', user.id)) as {
    data: { club_id: string }[] | null;
  };
  const clubIds = new Set((coachRows || []).map((row) => row.club_id));
  const filteredRecords = (records || []).filter((record: any) => clubIds.has(record.athletes?.club_id));

  return { success: true, data: filteredRecords };
}
