'use server';

import { createClient } from '@/lib/db/server';
import { getCached } from '@/lib/utils/cache';

export interface SystemWideReportParams {
  startDate: string;
  endDate: string;
  clubId?: string;
}

export interface SystemWideReportData {
  totalAthletes: number;
  totalSessions: number;
  totalAttendanceRecords: number;
  averageAttendanceRate: number;
  clubBreakdown: {
    clubId: string;
    clubName: string;
    sportType: string;
    athleteCount: number;
    sessionCount: number;
    attendanceRate: number;
  }[];
}

/**
 * Generate system-wide report for admins
 * Aggregates data across all clubs (Requirements 12.3)
 */
export async function generateSystemWideReport(
  params: SystemWideReportParams
): Promise<{ data?: SystemWideReportData; error?: string }> {
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

    // Verify user is admin
    const { data: userRole, error: roleError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // @ts-ignore
    if (roleError || !userRole || userRole.role !== 'admin') {
      return { error: 'Unauthorized: admin access only' };
    }

    // Validate date range
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    
    if (startDate > endDate) {
      return { error: 'Start date must be on or before end date' };
    }

    // Get all clubs or specific club
    let clubsQuery = db
      .from('clubs')
      .select('id, name, sport_type')
      .order('name');

    if (params.clubId) {
      clubsQuery = clubsQuery.eq('id', params.clubId);
    }

    const { data: clubs, error: clubsError } = await clubsQuery;

    if (clubsError) {
      console.error('Clubs query error:', clubsError);
      return { error: 'An error occurred while loading clubs' };
    }

    if (!clubs || clubs.length === 0) {
      return {
        data: {
          totalAthletes: 0,
          totalSessions: 0,
          totalAttendanceRecords: 0,
          averageAttendanceRate: 0,
          clubBreakdown: [],
        },
      };
    }

    const clubIds = clubs.map((c: any) => c.id);

    // Get all sessions in date range
    let sessionsQuery = db
      .from('training_sessions')
      .select('id, club_id')
      .in('club_id', clubIds)
      .gte('session_date', params.startDate)
      .lte('session_date', params.endDate);

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.error('Sessions query error:', sessionsError);
      return { error: 'An error occurred while loading training sessions' };
    }

    const sessionIds = (sessions || []).map((s: any) => s.id);

    // Get all athletes
    const { data: athletes, error: athletesError } = await db
      .from('athletes')
      .select('id, club_id')
      .in('club_id', clubIds);

    if (athletesError) {
      console.error('Athletes query error:', athletesError);
      return { error: 'An error occurred while loading athletes' };
    }

    // Get all attendance records
    let attendanceRecords: any[] = [];
    if (sessionIds.length > 0) {
      const { data, error: attendanceError } = await db
        .from('attendance')
        .select('athlete_id, status, training_session_id')
        .in('training_session_id', sessionIds);

      if (attendanceError) {
        console.error('Attendance query error:', attendanceError);
        return { error: 'An error occurred while loading attendance data' };
      }

      attendanceRecords = data || [];
    }

    // Build maps for efficient lookup
    const sessionsByClub = new Map<string, number>();
    (sessions || []).forEach((session: any) => {
      const clubId = session.club_id;
      sessionsByClub.set(clubId, (sessionsByClub.get(clubId) || 0) + 1);
    });

    const athletesByClub = new Map<string, number>();
    (athletes || []).forEach((athlete: any) => {
      const clubId = athlete.club_id;
      athletesByClub.set(clubId, (athletesByClub.get(clubId) || 0) + 1);
    });

    // Build session to club map
    const sessionToClub = new Map<string, string>();
    (sessions || []).forEach((session: any) => {
      sessionToClub.set(session.id, session.club_id);
    });

    const attendanceByClub = new Map<string, any[]>();
    attendanceRecords.forEach((record: any) => {
      const clubId = sessionToClub.get(record.training_session_id);
      if (clubId) {
        if (!attendanceByClub.has(clubId)) {
          attendanceByClub.set(clubId, []);
        }
        attendanceByClub.get(clubId)!.push(record);
      }
    });

    // Calculate club breakdown
    const clubBreakdown = clubs.map((club: any) => {
      const clubId = club.id;
      const athleteCount = athletesByClub.get(clubId) || 0;
      const sessionCount = sessionsByClub.get(clubId) || 0;
      const attendanceRecs = attendanceByClub.get(clubId) || [];

      const totalAttendance = attendanceRecs.length;
      const presentCount = attendanceRecs.filter((r: any) => r.status === 'present').length;
      const lateCount = attendanceRecs.filter((r: any) => r.status === 'late').length;

      const attendanceRate =
        totalAttendance > 0
          ? Math.round(((presentCount + lateCount) / totalAttendance) * 100 * 10) / 10
          : 0;

      return {
        clubId,
        clubName: club.name,
        sportType: club.sport_type,
        athleteCount,
        sessionCount,
        attendanceRate,
      };
    });

    // Calculate totals
    const totalAthletes = athletes?.length || 0;
    const totalSessions = sessions?.length || 0;
    const totalAttendanceRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((r: any) => r.status === 'present').length;
    const lateCount = attendanceRecords.filter((r: any) => r.status === 'late').length;
    const averageAttendanceRate =
      totalAttendanceRecords > 0
        ? Math.round(((presentCount + lateCount) / totalAttendanceRecords) * 100 * 10) / 10
        : 0;

    // Sort club breakdown by attendance rate
    clubBreakdown.sort((a, b) => b.attendanceRate - a.attendanceRate);

    return {
      data: {
        totalAthletes,
        totalSessions,
        totalAttendanceRecords,
        averageAttendanceRate,
        clubBreakdown,
      },
    };
  } catch (error) {
    console.error('Unexpected error in generateSystemWideReport:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Export system-wide report as CSV
 */
export async function exportSystemWideReportCSV(
  params: SystemWideReportParams
): Promise<{ data?: string; error?: string }> {
  try {
    // Generate the report data
    const result = await generateSystemWideReport(params);
    
    if (result.error) {
      return { error: result.error };
    }
    
    if (!result.data) {
      return { error: 'No data to export' };
    }

    const reportData = result.data;

    // Create CSV header
    const headers = [
      'NameClub',
      'Sport type',
      'Athlete count',
      'Training session count',
      'Attendance rate (%)',
    ];

    // Create CSV rows
    const rows = reportData.clubBreakdown.map((club) => [
      club.clubName,
      club.sportType,
      club.athleteCount.toString(),
      club.sessionCount.toString(),
      club.attendanceRate.toFixed(1),
    ]);

    // Add summary row
    rows.push([
      'Total',
      '-',
      reportData.totalAthletes.toString(),
      reportData.totalSessions.toString(),
      reportData.averageAttendanceRate.toFixed(1),
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
    console.error('Unexpected error in exportSystemWideReportCSV:', error);
    return { error: 'Error exporting data' };
  }
}
