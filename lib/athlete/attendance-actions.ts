'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/lib/audit/actions';
import { Database } from '@/types/database.types';
import { invalidatePattern } from '@/lib/utils/cache';

type TrainingSession = Database['public']['Tables']['training_sessions']['Row'];
type AttendanceLog = Database['public']['Tables']['attendance']['Row'];
type AttendanceLogInsert = Database['public']['Tables']['attendance']['Insert'];
type LeaveRequest = Database['public']['Tables']['leave_requests']['Row'];
type LeaveRequestInsert = Database['public']['Tables']['leave_requests']['Insert'];

interface SessionWithAttendance extends TrainingSession {
  attendance?: AttendanceLog | null;
  leave_request?: LeaveRequest | null;
}

interface AttendanceStats {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  attendanceRate: number;
}

/**
 * Get all training sessions for an athlete's club
 * Includes attendance status for each session
 * OPTIMIZED: Added pagination support
 */
export async function getAthleteSessions(filter?: {
  upcoming?: boolean;
  past?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data?: SessionWithAttendance[]; total?: number; error?: string }> {
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

    // Get athlete profile
    const { data: athlete, error: athleteError } = await db
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'Athlete profile not found' };
    }

    // Build query for sessions with pagination
    const limit = filter?.limit || 100; // Default limit
    const offset = filter?.offset || 0;

    // @ts-ignore
    let query = db
      .from('training_sessions')
      .select('*', { count: 'exact' })
      // @ts-ignore
      .eq('club_id', athlete.club_id)
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply filters
    const today = new Date().toISOString().split('T')[0];

    if (filter?.upcoming) {
      query = query.gte('session_date', today);
    } else if (filter?.past) {
      query = query.lt('session_date', today);
    }

    const { data: sessions, error: sessionsError, count } = await query;

    if (sessionsError) {
      console.error('Sessions query error:', sessionsError);
      return { error: 'An error occurred while loading training sessions' };
    }

    // Get attendance records for this athlete
    const { data: attendanceRecords, error: attendanceError } = await db
      .from('attendance')
      .select('*')
      // @ts-ignore
      .eq('athlete_id', athlete.id);

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError);
    }

    // Get leave requests for this athlete
    const { data: leaveRequests, error: leaveError } = await db
      .from('leave_requests')
      .select('*')
      // @ts-ignore
      .eq('athlete_id', athlete.id);

    if (leaveError) {
      console.error('Leave requests query error:', leaveError);
    }

    // Combine sessions with attendance and leave request data
    const sessionsWithAttendance: SessionWithAttendance[] = (sessions || []).map((session) => {
      const attendance = attendanceRecords?.find(
        // @ts-ignore
        (record) => record.training_session_id === session.id
      );
      const leaveRequest = leaveRequests?.find(
        // @ts-ignore
        (request) => request.session_id === session.id
      );
      return {
        // @ts-ignore - TypeScript has issues with spread on generated types
        ...session,
        attendance: attendance || null,
        leave_request: leaveRequest || null,
      };
    });

    return { data: sessionsWithAttendance, total: count || 0 };
  } catch (error) {
    console.error('Unexpected error in getAthleteSessions:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get details of a specific training session
 */
export async function getSessionDetails(sessionId: string): Promise<{
  data?: SessionWithAttendance;
  error?: string;
}> {
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

    // Get athlete profile
    const { data: athlete, error: athleteError } = await db
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'Athlete profile not found' };
    }

    // Get session
    const { data: session, error: sessionError } = await db
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return { error: 'Training session not found' };
    }

    // Verify session belongs to athlete's club
    // @ts-ignore
    if (session.club_id !== athlete.club_id) {
      return { error: 'You cannot view another club\'s schedule' };
    }

    // Get attendance record
    const { data: attendance, error: attendanceError } = await db
      .from('attendance')
      .select('*')
      .eq('training_session_id', sessionId)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .maybeSingle();

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError);
    }

    // Get leave request
    const { data: leaveRequest, error: leaveError } = await db
      .from('leave_requests')
      .select('*')
      .eq('session_id', sessionId)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .maybeSingle();

    if (leaveError) {
      console.error('Leave request query error:', leaveError);
    }

    return {
      data: {
        // @ts-ignore
        ...session,
        attendance: attendance || null,
        leave_request: leaveRequest || null,
      },
    };
  } catch (error) {
    console.error('Unexpected error in getSessionDetails:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Check in to a training session
 * Validates time window: 30 minutes before to 15 minutes after start time
 */
export async function athleteCheckIn(sessionId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
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

    // Get athlete profile
    const { data: athlete, error: athleteError } = await db
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'Athlete profile not found' };
    }

    // Get session
    const { data: session, error: sessionError } = await db
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return { error: 'Training session not found' };
    }

    // Verify session belongs to athlete's club
    // @ts-ignore
    if (session.club_id !== athlete.club_id) {
      return { error: "You cannot check in to another club's session" };
    }

    // Check if session is cancelled
    // @ts-ignore
    if (session.status === 'cancelled') {
      return { error: 'This training session has been cancelled' };
    }

    // Validate check-in time window
    // @ts-ignore
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    
    // 30 minutes before
    const earliestCheckIn = new Date(sessionDateTime.getTime() - 30 * 60 * 1000);
    // 15 minutes after
    const latestCheckIn = new Date(sessionDateTime.getTime() + 15 * 60 * 1000);

    if (now < earliestCheckIn) {
      return { error: 'Check-in is not open yet (available 30 minutes before start)' };
    }

    if (now > latestCheckIn) {
      return { error: 'Check-in window has closed (available until 15 minutes after start)' };
    }

    // Check for existing attendance
    const { data: existingAttendance, error: checkError } = await db
      .from('attendance')
      .select('*')
      .eq('training_session_id', sessionId)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .maybeSingle();

    if (checkError) {
      console.error('Check error:', checkError);
      return { error: 'Error validating data' };
    }

    if (existingAttendance) {
      return { error: 'You have already checked in' };
    }

    // Determine status based on time
    let status: 'present' | 'late' = 'present';
    if (now > sessionDateTime) {
      status = 'late';
    }

    // Create attendance record
    const attendanceData: AttendanceLogInsert = {
      session_id: sessionId,
      // @ts-ignore
      athlete_id: athlete.id,
      status: status,
      check_in_time: now.toISOString(),
      check_in_method: 'manual',
      notes: null,
    };

    // @ts-ignore
    const { data: newAttendance, error: insertError } = await db
      .from('attendance')
      // @ts-ignore
      .insert(attendanceData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return { error: 'Error recording check-in' };
    }

    // Log audit event
    await createAuditLog({
      userId: user.id,
      actionType: 'attendance.create',
      entityType: 'attendance_log',
      // @ts-ignore
      entityId: newAttendance.id,
      details: { session_id: sessionId, status, method: 'self_checkin' },
    });

    revalidatePath('/dashboard/athlete/schedule');
    revalidatePath('/dashboard/athlete/attendance');

    // Invalidate stats cache
    invalidatePattern('attendance-stats:.*');
    invalidatePattern('club-stats:.*');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in athleteCheckIn:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Request leave for a training session
 * Must be at least 2 hours before session start
 * Reason must be at least 10 characters
 */
export async function requestLeave(data: {
  sessionId: string;
  reason: string;
}): Promise<{ success?: boolean; error?: string }> {
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

    // Get athlete profile
    const { data: athlete, error: athleteError } = await db
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'Athlete profile not found' };
    }

    // Validate reason
    if (!data.reason || data.reason.trim().length < 10) {
      return { error: 'Please enter a reason of at least 10 characters' };
    }

    // Get session
    const { data: session, error: sessionError } = await db
      .from('training_sessions')
      .select('*')
      .eq('id', data.sessionId)
      .single();

    if (sessionError || !session) {
      return { error: 'Training session not found' };
    }

    // Verify session belongs to athlete's club
    // @ts-ignore
    if (session.club_id !== athlete.club_id) {
      return { error: "You cannot request leave for another club's session" };
    }

    // Check if session is cancelled
    // @ts-ignore
    if (session.status === 'cancelled') {
      return { error: 'This training session has been cancelled' };
    }

    // Validate timing - must be at least 2 hours before session
    // @ts-ignore
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    if (sessionDateTime < twoHoursFromNow) {
      return { error: 'Leave must be requested at least 2 hours before start time' };
    }

    // Check for existing leave request
    const { data: existingRequest, error: checkError } = await db
      .from('leave_requests')
      .select('*')
      .eq('session_id', data.sessionId)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .maybeSingle();

    if (checkError) {
      console.error('Check error:', checkError);
      return { error: 'Error validating data' };
    }

    if (existingRequest) {
      return { error: 'You have already submitted leave for this session' };
    }

    // Check if already checked in
    const { data: existingAttendance, error: attendanceCheckError } = await db
      .from('attendance')
      .select('*')
      .eq('training_session_id', data.sessionId)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .maybeSingle();

    if (attendanceCheckError) {
      console.error('Attendance check error:', attendanceCheckError);
    }

    if (existingAttendance) {
      return { error: 'You have already checked in and cannot request leave' };
    }

    // Create leave request
    const leaveRequestData: LeaveRequestInsert = {
      session_id: data.sessionId,
      // @ts-ignore
      athlete_id: athlete.id,
      reason: data.reason.trim(),
      status: 'pending',
      requested_at: now.toISOString(),
    };

    // @ts-ignore
    const { data: newRequest, error: insertError } = await db
      .from('leave_requests')
      // @ts-ignore
      .insert(leaveRequestData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return { error: 'Error saving leave request' };
    }

    // Log audit event (using attendance type as leave_request not yet in audit types)
    await createAuditLog({
      userId: user.id,
      actionType: 'attendance.create',
      entityType: 'attendance_log',
      // @ts-ignore
      entityId: newRequest.id,
      details: { 
        type: 'leave_request',
        session_id: data.sessionId, 
        reason: data.reason 
      },
    });

    revalidatePath('/dashboard/athlete/schedule');
    revalidatePath('/dashboard/athlete/attendance');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in requestLeave:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get attendance history for the current athlete
 */
export async function getMyAttendance(filter?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<{
  data?: (AttendanceLog & { training_sessions?: TrainingSession })[];
  error?: string;
}> {
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

    // Get athlete profile
    const { data: athlete, error: athleteError } = await db
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'Athlete profile not found' };
    }

    // Build query
    let query = db
      .from('attendance')
      .select(`
        *,
        training_sessions (*)
      `)
      // @ts-ignore
      .eq('athlete_id', athlete.id)
      .order('created_at', { ascending: false });

    // Apply date filters if provided
    if (filter?.startDate) {
      // @ts-ignore
      query = query.gte('training_sessions.session_date', filter.startDate);
    }

    if (filter?.endDate) {
      // @ts-ignore
      query = query.lte('training_sessions.session_date', filter.endDate);
    }

    // Apply limit
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data: attendance, error: attendanceError } = await query;

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError);
      return { error: 'An error occurred while loading attendance history' };
    }

    // @ts-ignore
    return { data: attendance };
  } catch (error) {
    console.error('Unexpected error in getMyAttendance:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get attendance statistics for the current athlete
 */
export async function getAttendanceStats(filter?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ data?: AttendanceStats; error?: string }> {
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

    // Get athlete profile
    const { data: athlete, error: athleteError } = await db
      .from('athletes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return { error: 'Athlete profile not found' };
    }

    // Build query
    let query = db
      .from('attendance')
      .select(`
        *,
        training_sessions!inner (
          session_date
        )
      `)
      // @ts-ignore
      .eq('athlete_id', athlete.id);

    // Apply date filters if provided
    if (filter?.startDate) {
      // @ts-ignore
      query = query.gte('training_sessions.session_date', filter.startDate);
    }

    if (filter?.endDate) {
      // @ts-ignore
      query = query.lte('training_sessions.session_date', filter.endDate);
    }

    const { data: attendance, error: attendanceError } = await query;

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError);
      return { error: 'Error loading statistics' };
    }

    // Calculate statistics
    const totalSessions = attendance?.length || 0;
    // @ts-ignore - TypeScript has issues with nested query types
    const presentCount = attendance?.filter((a) => a.status === 'present').length || 0;
    // @ts-ignore
    const absentCount = attendance?.filter((a) => a.status === 'absent').length || 0;
    // @ts-ignore
    const excusedCount = attendance?.filter((a) => a.status === 'excused').length || 0;
    // @ts-ignore
    const lateCount = attendance?.filter((a) => a.status === 'late').length || 0;

    // Calculate attendance rate (present + late / total)
    const attendanceRate =
      totalSessions > 0
        ? Math.round(((presentCount + lateCount) / totalSessions) * 100 * 10) / 10
        : 0;

    const stats: AttendanceStats = {
      totalSessions,
      presentCount,
      absentCount,
      excusedCount,
      lateCount,
      attendanceRate,
    };

    return { data: stats };
  } catch (error) {
    console.error('Unexpected error in getAttendanceStats:', error);
    return { error: 'An unexpected error occurred' };
  }
}

// Note: requestLeave function is defined earlier in this file (line ~379)
