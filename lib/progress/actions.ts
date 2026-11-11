'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';

export interface ProgressReportInput {
  athleteId: string;
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  periodStart: string;
  periodEnd: string;
  title: string;
  summary?: string;
  highlights?: string[];
  areasForImprovement?: string[];
  coachComments?: string;
}

/**
 * Generate a progress snapshot for an athlete
 */
export async function generateProgressSnapshot(
  athleteId: string,
  periodStart: string,
  periodEnd: string,
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
) {
  const db = await createClient();

  const { data, error } = await db.rpc('calculate_progress_snapshot', {
    p_athlete_id: athleteId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_period_type: periodType,
  } as any);

  if (error) {
    console.error('Error generating progress snapshot:', error);
    return { success: false, error: 'Failed to generate progress snapshot' };
  }

  return { success: true, data };
}

/**
 * Get progress snapshots for an athlete
 */
export async function getProgressSnapshots(athleteId: string, periodType?: string) {
  const db = await createClient();

  let query = db
    .from('progress_snapshots')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('period_start', { ascending: false });

  if (periodType) {
    query = query.eq('period_type', periodType);
  }

  const { data, error } = await db
    .from('progress_snapshots')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('period_start', { ascending: false });

  if (error) {
    console.error('Error fetching progress snapshots:', error);
    return { success: false, error: 'Failed to fetch progress snapshots', data: [] };
  }

  return { success: true, data: data || [] };
}

/**
 * Create a progress report
 */
export async function createProgressReport(input: ProgressReportInput) {
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
    .eq('id', input.athleteId)
    .maybeSingle() as any;

  if (athleteError || !athlete) {
    return { success: false, error: 'Athlete not found' };
  }

  if (athlete.club_id !== coach.club_id) {
    return { success: false, error: 'Cannot create report for athletes from other clubs' };
  }

  // Generate snapshot first
  const snapshotResult = await generateProgressSnapshot(
    input.athleteId,
    input.periodStart,
    input.periodEnd,
    input.reportType === 'custom' ? 'monthly' : input.reportType
  );

  if (!snapshotResult.success) {
    return { success: false, error: 'Failed to generate progress snapshot' };
  }

  // Get the snapshot data
  const { data: snapshot, error: snapshotError } = await db
    .from('progress_snapshots')
    .select('*')
    .eq('athlete_id', input.athleteId)
    .eq('period_start', input.periodStart)
    .eq('period_end', input.periodEnd)
    .maybeSingle() as any;

  if (snapshotError || !snapshot) {
    return { success: false, error: 'Failed to retrieve snapshot data' };
  }

  // Get performance trend data for charts
  const { data: performanceData } = await db
    .from('performance_records')
    .select('test_date, test_name, score, unit')
    .eq('athlete_id', input.athleteId)
    .gte('test_date', input.periodStart)
    .lte('test_date', input.periodEnd)
    .order('test_date', { ascending: true });

  // Get attendance trend data
  const { data: attendanceData } = await db
    .from('attendance')
    .select(`
      status,
      check_in_time,
      training_sessions!inner(session_date)
    `)
    .eq('athlete_id', input.athleteId)
    .gte('training_sessions.session_date', input.periodStart)
    .lte('training_sessions.session_date', input.periodEnd)
    .order('training_sessions.session_date', { ascending: true });

  // Prepare metrics object
  const metrics = {
    attendance: {
      total_sessions: snapshot.total_sessions,
      attended_sessions: snapshot.attended_sessions,
      attendance_rate: snapshot.attendance_rate,
      late_count: snapshot.late_count,
      excused_count: snapshot.excused_count,
    },
    performance: {
      tests_count: snapshot.performance_tests_count,
      avg_score: snapshot.avg_performance_score,
      best_score: snapshot.best_performance_score,
    },
    goals: {
      active_count: snapshot.active_goals_count,
      completed_count: snapshot.completed_goals_count,
      avg_progress: snapshot.avg_goal_progress,
    },
  };

  // Prepare charts data
  const chartsData = {
    performance_trend: performanceData || [],
    attendance_trend: attendanceData || [],
  };

  // Create the report
  const insertData: any = {
    athlete_id: input.athleteId,
    generated_by: coach.id,
    report_type: input.reportType,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    title: input.title,
    summary: input.summary || null,
    highlights: input.highlights || [],
    areas_for_improvement: input.areasForImprovement || [],
    coach_comments: input.coachComments || null,
    metrics,
    charts_data: chartsData,
    status: 'draft',
  };
  
  const { data: report, error: reportError } = (await (db
    .from('progress_reports') as any)
    .insert(insertData)
    .select()
    .single()) as any;

  if (reportError || !report) {
    console.error('Error creating progress report:', reportError);
    return { success: false, error: 'Failed to create progress report' };
  }

  revalidatePath('/dashboard/coach/athletes');
  revalidatePath('/dashboard/athlete/progress');

  return { success: true, data: report };
}

/**
 * Publish a progress report
 */
export async function publishProgressReport(reportId: string) {
  const db = await createClient();

  const updateData: any = {
    status: 'published',
    published_at: new Date().toISOString(),
  };

  const { data, error } = (await (db
    .from('progress_reports') as any)
    .update(updateData)
    .eq('id', reportId)
    .select()
    .single()) as any;

  if (error) {
    console.error('Error publishing progress report:', error);
    return { success: false, error: 'Failed to publish progress report' };
  }

  revalidatePath('/dashboard/coach/athletes');
  revalidatePath('/dashboard/athlete/progress');

  return { success: true, data };
}

/**
 * Get progress reports for an athlete
 */
export async function getProgressReports(athleteId: string, status?: string) {
  const db = await createClient();

  let query = db
    .from('progress_reports')
    .select(`
      *,
      athletes (
        id,
        first_name,
        last_name,
        nickname
      ),
      coaches (
        id,
        first_name,
        last_name
      )
    `)
    .eq('athlete_id', athleteId)
    .order('period_end', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching progress reports:', error);
    return { success: false, error: 'Failed to fetch progress reports', data: [] };
  }

  return { success: true, data: data || [] };
}

/**
 * Get a single progress report
 */
export async function getProgressReport(reportId: string) {
  const db = await createClient();

  const { data, error } = await db
    .from('progress_reports')
    .select(`
      *,
      athletes (
        id,
        first_name,
        last_name,
        nickname,
        date_of_birth,
        club_id,
        clubs (
          name,
          sport_type
        )
      ),
      coaches (
        id,
        first_name,
        last_name
      )
    `)
    .eq('id', reportId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching progress report:', error);
    return { success: false, error: 'Failed to fetch progress report' };
  }

  if (!data) {
    return { success: false, error: 'Progress report not found' };
  }

  return { success: true, data };
}

/**
 * Get athlete's own progress reports (for athlete dashboard)
 */
export async function getMyProgressReports() {
  const db = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', data: [] };
  }

  // Get athlete profile
  const { data: athlete, error: athleteError } = await db
    .from('athletes')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle() as any;

  if (athleteError || !athlete) {
    return { success: false, error: 'Athlete profile not found', data: [] };
  }

  return getProgressReports(athlete.id, 'published');
}

/**
 * Delete a progress report
 */
export async function deleteProgressReport(reportId: string) {
  const db = await createClient();

  const { error } = await db
    .from('progress_reports')
    .delete()
    .eq('id', reportId);

  if (error) {
    console.error('Error deleting progress report:', error);
    return { success: false, error: 'Failed to delete progress report' };
  }

  revalidatePath('/dashboard/coach/athletes');
  revalidatePath('/dashboard/athlete/progress');

  return { success: true };
}
