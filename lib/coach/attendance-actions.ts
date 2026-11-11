'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/lib/audit/actions';
import { Database } from '@/types/database.types';
import { invalidatePattern } from '@/lib/utils/cache';

type AttendanceLog = Database['public']['Tables']['attendance']['Row'];
type AttendanceLogInsert = Database['public']['Tables']['attendance']['Insert'];
type AttendanceLogUpdate = Database['public']['Tables']['attendance']['Update'];
type AttendanceStatus = Database['public']['Tables']['attendance']['Row']['status'];

// Leave request types
type LeaveRequest = {
  id: string;
  session_id: string;
  athlete_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

interface LeaveRequestWithDetails extends LeaveRequest {
  training_sessions?: {
    id: string;
    title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    location: string;
  };
  athletes?: {
    id: string;
    first_name: string;
    last_name: string;
    nickname: string | null;
  };
}

interface AthleteWithAttendance {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  attendance?: AttendanceLog;
}

/**
 * Get attendance list for a training session
 * Returns all athletes in the club with their attendance status
 * OPTIMIZED: Uses LEFT JOIN to fetch athletes and attendance in a single query
 */
export async function getSessionAttendance(sessionId: string): Promise<{
  data?: AthleteWithAttendance[];
  session?: any;
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

    // Get coach profile
    const { data: coach, error: coachError } = await db
      .from('coaches')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (coachError || !coach) {
      return { error: 'Coach profile not found' };
    }

    // Get session and verify it belongs to coach
    const { data: session, error: sessionError } = await db
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return { error: 'Training session not found' };
    }

    // @ts-ignore
    if (session.coach_id !== coach.id) {
      return { error: 'Unauthorized: You cannot view another coach\'s schedule' };
    }

    // OPTIMIZED: Single query with LEFT JOIN to get athletes and their attendance
    // This eliminates the N+1 query problem
    // @ts-ignore
    const { data: athletesData, error: athletesError } = await db
      .from('athletes')
      .select(`
        id,
        first_name,
        last_name,
        nickname,
        attendance!left (
          id,
          status,
          check_in_time,
          check_in_method,
          notes,
          created_at,
          updated_at
        )
      `)
      // @ts-ignore
      .eq('club_id', coach.club_id)
      .eq('attendance.training_session_id', sessionId)
      .order('first_name', { ascending: true });

    if (athletesError) {
      console.error('Athletes query error:', athletesError);
      return { error: 'An error occurred while loading athletes' };
    }

    // Transform the data to match the expected format
    // @ts-ignore
    const athletesWithAttendance: AthleteWithAttendance[] = (athletesData || []).map((athlete) => {
      // @ts-ignore
      const attendanceArray = athlete.attendance || [];
      // @ts-ignore
      const attendance = attendanceArray.length > 0 ? attendanceArray[0] : undefined;
      
      return {
        // @ts-ignore
        id: athlete.id,
        // @ts-ignore
        first_name: athlete.first_name,
        // @ts-ignore
        last_name: athlete.last_name,
        // @ts-ignore
        nickname: athlete.nickname,
        attendance,
      };
    });

    return {
      data: athletesWithAttendance,
      session,
    };
  } catch (error) {
    console.error('Unexpected error in getSessionAttendance:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Mark or update attendance for an athlete
 */
export async function markAttendance(data: {
  sessionId: string;
  athleteId: string;
  status: AttendanceStatus;
  notes?: string;
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

    // Get coach profile
    const { data: coach, error: coachError } = await db
      .from('coaches')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (coachError || !coach) {
      return { error: 'Coach profile not found' };
    }

    // Verify session belongs to coach
    const { data: session, error: sessionError } = await db
      .from('training_sessions')
      .select('*')
      .eq('id', data.sessionId)
      .single();

    if (sessionError || !session) {
      return { error: 'Training session not found' };
    }

    // @ts-ignore
    if (session.coach_id !== coach.id) {
      return { error: 'Unauthorized: You cannot take attendance on another coach\'s schedule' };
    }

    // Verify athlete belongs to the same club
    const { data: athlete, error: athleteError } = await db
      .from('athletes')
      .select('*')
      .eq('id', data.athleteId)
      .single();

    if (athleteError || !athlete) {
      return { error: 'Athlete profile not found' };
    }

    // @ts-ignore
    if (athlete.club_id !== coach.club_id) {
      return { error: 'Athletes are not in the same club' };
    }

    // Check if attendance already exists
    const { data: existingAttendance, error: checkError } = await db
      .from('attendance')
      .select('*')
      .eq('training_session_id', data.sessionId)
      .eq('athlete_id', data.athleteId)
      .maybeSingle();

    if (checkError) {
      console.error('Check error:', checkError);
      return { error: 'Error validating data' };
    }

    if (existingAttendance) {
      // Update existing attendance
      const updateData: AttendanceLogUpdate = {
        status: data.status,
        notes: data.notes || null,
      };

      // @ts-ignore - type inference issue
      const { error: updateError } = await db
        .from('attendance')
        // @ts-ignore
        .update(updateData)
        // @ts-ignore
        .eq('id', existingAttendance.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return { error: 'An error occurred while updating attendance' };
      }

      // Log audit event
      await createAuditLog({
        userId: user.id,
        actionType: 'attendance.update',
        entityType: 'attendance_log',
        // @ts-ignore
        entityId: existingAttendance.id,
        // @ts-ignore
        details: updateData,
      });
    } else {
      // Create new attendance
      const insertData: AttendanceLogInsert = {
        session_id: data.sessionId,
        athlete_id: data.athleteId,
        status: data.status,
        check_in_method: 'manual',
        notes: data.notes || null,
        check_in_time: data.status === 'present' ? new Date().toISOString() : null,
      };

      // @ts-ignore - type inference issue
      const { data: newAttendance, error: insertError } = await db
        .from('attendance')
        // @ts-ignore
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return { error: 'An error occurred while recording attendance' };
      }

      // Log audit event
      await createAuditLog({
        userId: user.id,
        actionType: 'attendance.create',
        entityType: 'attendance_log',
        // @ts-ignore
        entityId: newAttendance.id,
        details: insertData,
      });
    }

    revalidatePath(`/dashboard/coach/attendance/${data.sessionId}`);
    revalidatePath('/dashboard/coach/sessions');

    // Invalidate stats cache
    invalidatePattern('attendance-stats:.*');
    invalidatePattern('club-stats:.*');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in markAttendance:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get leave requests for coach's sessions
 */
export async function getLeaveRequests(filter?: {
  status?: 'pending' | 'approved' | 'rejected';
  sessionId?: string;
}): Promise<{
  data?: any[];
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

    // Get coach profile
    const { data: coach, error: coachError } = await db
      .from('coaches')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (coachError || !coach) {
      return { error: 'Coach profile not found' };
    }

    // Build query for leave requests
    let query = db
      .from('leave_requests')
      .select(`
        *,
        training_sessions!inner(*),
        athletes!inner(*)
      `)
      // @ts-ignore
      .eq('training_sessions.coach_id', user.id);

    // Apply filters
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    if (filter?.sessionId) {
      query = query.eq('session_id', filter.sessionId);
    }

    query = query.order('requested_at', { ascending: false });

    const { data: leaveRequests, error: requestsError } = await query;

    if (requestsError) {
      console.error('Leave requests query error:', requestsError);
      return { error: 'Error loading leave requests' };
    }

    return { data: leaveRequests };
  } catch (error) {
    console.error('Unexpected error in getLeaveRequests:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Review (approve or reject) a leave request
 */
export async function reviewLeaveRequest(
  leaveRequestId: string,
  action: 'approve' | 'reject'
): Promise<{ success?: boolean; error?: string }> {
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
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (coachError || !coach) {
      return { error: 'Coach profile not found' };
    }

    // Get leave request and verify coach owns the session
    const { data: leaveRequest, error: requestError } = await db
      .from('leave_requests')
      .select('*, training_sessions!inner(*)')
      .eq('id', leaveRequestId)
      .single();

    if (requestError || !leaveRequest) {
      return { error: 'Leave request not found' };
    }

    // @ts-ignore
    if (leaveRequest.training_sessions.coach_id !== user.id) {
      return { error: 'Unauthorized: You cannot approve leave requests on another coach\'s schedule' };
    }

    // @ts-ignore
    if (leaveRequest.status !== 'pending') {
      return { error: 'This leave request was already processed' };
    }

    // Update leave request status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { error: updateError } = await (db as any)
      .from('leave_requests')
      .update({
        status: newStatus,
        reviewed_by: (coach as any).id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', leaveRequestId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { error: 'Error updating leave request' };
    }

    // If approved, create an excused attendance record
    if (action === 'approve') {
      // @ts-ignore
      const sessionId = leaveRequest.session_id;
      // @ts-ignore
      const athleteId = leaveRequest.athlete_id;

      // Check if attendance already exists
      const { data: existingAttendance } = await db
        .from('attendance')
        .select('*')
        .eq('training_session_id', sessionId)
        .eq('athlete_id', athleteId)
        .maybeSingle();

      if (!existingAttendance) {
        // Create excused attendance record
        const { error: attendanceError } = await (db as any)
          .from('attendance')
          .insert({
            training_session_id: sessionId,
            athlete_id: athleteId,
            status: 'excused',
            check_in_method: 'manual',
            notes: `Leave approved: ${(leaveRequest as any).reason}`,
          });

        if (attendanceError) {
          console.error('Attendance creation error:', attendanceError);
          // Don't fail the whole operation if attendance creation fails
        }
      }
    }

    // Log audit event
    await createAuditLog({
      userId: user.id,
      actionType: 'attendance.update',
      entityType: 'attendance_log',
      entityId: leaveRequestId,
      details: { action, status: newStatus },
    });

    revalidatePath('/dashboard/coach/attendance');
    revalidatePath('/dashboard/coach/sessions');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in reviewLeaveRequest:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update attendance for an athlete
 */
export async function updateAttendance(
  attendanceId: string,
  data: {
    status?: AttendanceStatus;
    notes?: string;
  }
): Promise<{ success?: boolean; error?: string }> {
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
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (coachError || !coach) {
      return { error: 'Coach profile not found' };
    }

    // Get attendance and verify coach owns the session
    const { data: attendance, error: attendanceError } = await db
      .from('attendance')
      .select('*, training_sessions!inner(*)')
      .eq('id', attendanceId)
      .single();

    if (attendanceError || !attendance) {
      return { error: 'Attendance record not found' };
    }

    // @ts-ignore - TypeScript has issues with nested joins
    if (attendance.training_sessions.coach_id !== coach.id) {
      return { error: 'Unauthorized: You cannot edit attendance on another coach\'s schedule' };
    }

    // Prepare update data
    const updateData: AttendanceLogUpdate = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    // Update attendance
    // @ts-ignore - type inference issue
    const { error: updateError } = await db
      .from('attendance')
      // @ts-ignore
      .update(updateData)
      .eq('id', attendanceId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { error: 'An error occurred while updating attendance' };
    }

    // Log audit event
    await createAuditLog({
      userId: user.id,
      actionType: 'attendance.update',
      entityType: 'attendance_log',
      entityId: attendanceId,
      // @ts-ignore
      details: updateData,
    });

    // @ts-ignore
    revalidatePath(`/dashboard/coach/attendance/${attendance.training_session_id}`);

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateAttendance:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get all leave requests for coach's sessions
 * Returns leave requests with athlete and session details
 */
export async function getCoachLeaveRequests(filter?: {
  status?: 'pending' | 'approved' | 'rejected' | 'all';
}): Promise<{
  data?: LeaveRequestWithDetails[];
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

    // Get coach profile
    const { data: coach, error: coachError } = await db
      .from('coaches')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (coachError || !coach) {
      return { error: 'Coach profile not found' };
    }

    // Build query for leave requests
    let query = db
      .from('leave_requests')
      .select(`
        *,
        training_sessions!inner (
          id,
          title,
          session_date,
          start_time,
          end_time,
          location
        ),
        athletes!inner (
          id,
          first_name,
          last_name,
          nickname
        )
      `)
      // @ts-ignore
      .eq('training_sessions.coach_id', user.id)
      .order('requested_at', { ascending: false });

    // Apply status filter
    if (filter?.status && filter.status !== 'all') {
      query = query.eq('status', filter.status);
    }

    const { data: leaveRequests, error: queryError } = await query;

    if (queryError) {
      console.error('Leave requests query error:', queryError);
      return { error: 'Error loading leave requests' };
    }

    // @ts-ignore
    return { data: leaveRequests || [] };
  } catch (error) {
    console.error('Unexpected error in getCoachLeaveRequests:', error);
    return { error: 'An unexpected error occurred' };
  }
}

// Duplicate function removed - already exists earlier in file
