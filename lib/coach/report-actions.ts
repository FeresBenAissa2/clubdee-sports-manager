'use server';

import { createClient } from '@/lib/db/server';

export interface AttendanceReportParams {
  startDate: string;
  endDate: string;
  athleteId?: string;
}

export interface AthleteAttendanceReport {
  athleteId: string;
  athleteName: string;
  nickname: string | null;
  totalSessions: number;
  attended: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

/**
 * Generate attendance report for coach's club
 * Restricted to coach's club data only (Requirements 12.1)
 */
export async function generateAttendanceReport(
  params: AttendanceReportParams
): Promise<{ data?: AthleteAttendanceReport[]; error?: string }> {
  try {
    const db = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Get coach profile
    const { data: coach, error: coachError } = await db
      .from('coaches')
      .select('id, club_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (coachError || !coach) {
      return { error: 'Coach profile not found' };
    }

    // Validate date range
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    
    if (startDate > endDate) {
      return { error: 'Start date must be on or before end date' };
    }

    // Get all sessions in date range for coach's club
    let sessionsQuery = db
      .from('training_sessions')
      .select('id')
      // @ts-ignore
      .eq('club_id', coach.club_id)
      .gte('session_date', params.startDate)
      .lte('session_date', params.endDate);

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.error('Sessions query error:', sessionsError);
      return { error: 'An error occurred while loading training sessions' };
    }

    const sessionIds = (sessions || []).map((s: any) => s.id);
    
    if (sessionIds.length === 0) {
      return { data: [] };
    }

    // Get athletes query
    let athletesQuery = db
      .from('athletes')
      .select('id, first_name, last_name, nickname')
      // @ts-ignore
      .eq('club_id', coach.club_id)
      .order('first_name');

    // Filter by specific athlete if requested
    if (params.athleteId) {
      athletesQuery = athletesQuery.eq('id', params.athleteId);
    }

    const { data: athletes, error: athletesError } = await athletesQuery;

    if (athletesError) {
      console.error('Athletes query error:', athletesError);
      return { error: 'An error occurred while loading athletes' };
    }

    if (!athletes || athletes.length === 0) {
      return { data: [] };
    }

    // Get all attendance records for these sessions
    const { data: attendanceRecords, error: attendanceError } = await db
      .from('attendance')
      .select('athlete_id, status')
      .in('training_session_id', sessionIds);

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError);
      return { error: 'An error occurred while loading attendance data' };
    }

    // Build attendance map
    const attendanceByAthlete = new Map<string, any[]>();
    (attendanceRecords || []).forEach((record: any) => {
      const athleteId = record.athlete_id;
      if (!attendanceByAthlete.has(athleteId)) {
        attendanceByAthlete.set(athleteId, []);
      }
      attendanceByAthlete.get(athleteId)!.push(record);
    });

    // Calculate statistics for each athlete
    const totalSessions = sessionIds.length;
    const report: AthleteAttendanceReport[] = athletes.map((athlete: any) => {
      const records = attendanceByAthlete.get(athlete.id) || [];
      
      const attended = records.filter((r: any) => r.status === 'present').length;
      const absent = records.filter((r: any) => r.status === 'absent').length;
      const late = records.filter((r: any) => r.status === 'late').length;
      const excused = records.filter((r: any) => r.status === 'excused').length;
      
      // Calculate attendance rate (present + late / total sessions)
      const attendanceRate = totalSessions > 0
        ? Math.round(((attended + late) / totalSessions) * 100 * 10) / 10
        : 0;

      return {
        athleteId: athlete.id,
        athleteName: `${athlete.first_name} ${athlete.last_name}`,
        nickname: athlete.nickname,
        totalSessions,
        attended,
        absent,
        late,
        excused,
        attendanceRate,
      };
    });

    // Sort by attendance rate (highest first)
    report.sort((a, b) => b.attendanceRate - a.attendanceRate);

    return { data: report };
  } catch (error) {
    console.error('Unexpected error in generateAttendanceReport:', error);
    return { error: 'An unexpected error occurred' };
  }
}


/**
 * Export attendance report as CSV
 * Requirements: 12.2, 12.4 - Respect RLS policies (coach's club only)
 */
export async function exportAttendanceReportCSV(
  params: AttendanceReportParams
): Promise<{ data?: string; error?: string }> {
  try {
    // Generate the report data
    const result = await generateAttendanceReport(params);
    
    if (result.error) {
      return { error: result.error };
    }
    
    if (!result.data || result.data.length === 0) {
      return { error: 'No data to export' };
    }

    // Create CSV header
    const headers = [
      'NameAthletes',
      'Nickname',
      'All time',
      'Present',
      'Absent',
      'Late',
      'Leave',
      'Attendance rate (%)',
    ];

    // Create CSV rows
    const rows = result.data.map((row) => [
      row.athleteName,
      row.nickname || '-',
      row.totalSessions.toString(),
      row.attended.toString(),
      row.absent.toString(),
      row.late.toString(),
      row.excused.toString(),
      row.attendanceRate.toFixed(1),
    ]);

    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Add BOM for UTF-8 encoding (helps Excel display Thai characters correctly)
    const csvWithBOM = '\uFEFF' + csvContent;

    return { data: csvWithBOM };
  } catch (error) {
    console.error('Unexpected error in exportAttendanceReportCSV:', error);
    return { error: 'Error exporting data' };
  }
}

/**
 * Get performance records for export
 * Requirements: 12.2, 12.4 - Respect RLS policies (coach's club only)
 */
export async function getPerformanceDataForExport(params: {
  startDate: string;
  endDate: string;
  athleteId?: string;
}): Promise<{ data?: any[]; error?: string }> {
  try {
    const db = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Get coach profile
    const { data: coach, error: coachError } = await db
      .from('coaches')
      .select('id, club_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (coachError || !coach) {
      return { error: 'Coach profile not found' };
    }

    // Build query for performance records
    let query = db
      .from('performance_records')
      .select(`
        *,
        athletes!inner (
          id,
          first_name,
          last_name,
          nickname,
          club_id
        )
      `)
      // @ts-ignore
      .eq('athletes.club_id', coach.club_id)
      .gte('test_date', params.startDate)
      .lte('test_date', params.endDate)
      .order('test_date', { ascending: false });

    // Filter by specific athlete if requested
    if (params.athleteId) {
      query = query.eq('athlete_id', params.athleteId);
    }

    const { data: records, error: recordsError } = await query;

    if (recordsError) {
      console.error('Performance records query error:', recordsError);
      return { error: 'An error occurred while loading test results' };
    }

    return { data: records || [] };
  } catch (error) {
    console.error('Unexpected error in getPerformanceDataForExport:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Export performance data as CSV
 * Requirements: 12.2, 12.4 - Respect RLS policies (coach's club only)
 */
export async function exportPerformanceDataCSV(params: {
  startDate: string;
  endDate: string;
  athleteId?: string;
}): Promise<{ data?: string; error?: string }> {
  try {
    // Get the performance data
    const result = await getPerformanceDataForExport(params);
    
    if (result.error) {
      return { error: result.error };
    }
    
    if (!result.data || result.data.length === 0) {
      return { error: 'No data to export' };
    }

    // Create CSV header
    const headers = [
      'Test date',
      'NameAthletes',
      'Nickname',
      'Test type',
      'Test name',
      'Score',
      'Unit',
      'Notes',
    ];

    // Create CSV rows
    const rows = result.data.map((record: any) => [
      record.test_date,
      `${record.athletes.first_name} ${record.athletes.last_name}`,
      record.athletes.nickname || '-',
      record.test_type,
      record.test_name,
      record.score.toString(),
      record.unit,
      record.notes || '-',
    ]);

    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Add BOM for UTF-8 encoding
    const csvWithBOM = '\uFEFF' + csvContent;

    return { data: csvWithBOM };
  } catch (error) {
    console.error('Unexpected error in exportPerformanceDataCSV:', error);
    return { error: 'Error exporting data' };
  }
}
