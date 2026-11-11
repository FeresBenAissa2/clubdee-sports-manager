'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import {
  TrainingSession,
  AttendanceRecord,
  SessionIntegration,
  IntegrationError,
  IntegrationErrorType,
} from '@/types/integration';

/**
 * Session Integration Module
 * 
 * Handles the integration between Coach training sessions and Athlete dashboard.
 * Implements the SessionIntegration interface from the design document.
 * 
 * Features:
 * - Coach creates session → Athletes in same club see it in schedule
 * - Athletes can check-in to sessions
 * - Coach records attendance → Athlete stats update
 * - Today's sessions trigger recommendations
 */

/**
 * Called when a coach creates a new training session.
 * Triggers revalidation of athlete dashboards to show the new session.
 * 
 * @param session - The newly created training session
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 2.1** - Session visibility in athlete schedule
 */
export async function onSessionCreated(session: TrainingSession): Promise<void> {
  try {
    // Revalidate athlete dashboard paths to show new session
    revalidatePath('/dashboard/athlete');
    revalidatePath('/dashboard/athlete/schedule');
    
    // Revalidate coach paths as well
    revalidatePath('/dashboard/coach/sessions');
    
    console.log(`[SessionIntegration] Session created: ${session.id}`);
  } catch (error) {
    console.error('[SessionIntegration] Error in onSessionCreated:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to process session creation',
      { sessionId: session.id }
    );
  }
}

/**
 * Called when an athlete checks in to a training session.
 * Records the check-in and updates both athlete and coach dashboards.
 * 
 * @param sessionId - The ID of the training session
 * @param athleteId - The ID of the athlete checking in
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 2.4** - Bidirectional check-in visibility
 */
export async function onAthleteCheckIn(
  sessionId: string,
  athleteId: string
): Promise<void> {
  const db = await createClient();

  try {
    // Verify session exists
    const { data: session, error: sessionError } = await db
      .from('training_sessions')
      .select('id, club_id, session_date')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new IntegrationError(
        IntegrationErrorType.SESSION_NOT_FOUND,
        'Training session not found',
        { sessionId }
      );
    }

    // Verify athlete exists and belongs to the same club
    const { data: athlete, error: athleteError } = await db
      .from('athletes')
      .select('id, club_id')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      throw new IntegrationError(
        IntegrationErrorType.ATHLETE_NOT_FOUND,
        'Athlete not found',
        { athleteId }
      );
    }

    // @ts-ignore - Type inference issue
    if (athlete.club_id !== session.club_id) {
      throw new IntegrationError(
        IntegrationErrorType.CLUB_MISMATCH,
        'Athlete does not belong to the session club',
        { athleteId, sessionId }
      );
    }

    // Check if already checked in
    const { data: existingAttendance } = await (db as any)
      .from('attendance')
      .select('id')
      .eq('training_session_id', sessionId)
      .eq('athlete_id', athleteId)
      .maybeSingle();

    if (existingAttendance) {
      // Update existing attendance to present
      const { error: updateError } = await (db as any)
        .from('attendance')
        .update({
          status: 'present',
          check_in_time: new Date().toISOString(),
          check_in_method: 'qr',
        })
        .eq('id', (existingAttendance as any).id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Create new attendance record
      const { error: insertError } = await (db as any)
        .from('attendance')
        .insert({
          training_session_id: sessionId,
          athlete_id: athleteId,
          status: 'present',
          check_in_time: new Date().toISOString(),
          check_in_method: 'qr',
        });

      if (insertError) {
        throw insertError;
      }
    }

    // Revalidate both athlete and coach dashboards
    revalidatePath('/dashboard/athlete');
    revalidatePath('/dashboard/athlete/schedule');
    revalidatePath('/dashboard/athlete/attendance');
    revalidatePath('/dashboard/coach/sessions');
    revalidatePath(`/dashboard/coach/attendance/${sessionId}`);

    console.log(`[SessionIntegration] Athlete ${athleteId} checked in to session ${sessionId}`);
  } catch (error) {
    if (error instanceof IntegrationError) {
      throw error;
    }
    console.error('[SessionIntegration] Error in onAthleteCheckIn:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to record athlete check-in',
      { sessionId, athleteId }
    );
  }
}

/**
 * Called when a coach records attendance for a session.
 * Updates athlete statistics and dashboard.
 * 
 * @param attendance - The attendance record
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 2.3, 7.1** - Attendance statistics update
 */
export async function onAttendanceRecorded(attendance: AttendanceRecord): Promise<void> {
  try {
    // Revalidate athlete dashboard to update statistics
    revalidatePath('/dashboard/athlete');
    revalidatePath('/dashboard/athlete/attendance');
    revalidatePath('/dashboard/athlete/schedule');
    
    // Revalidate coach dashboard
    revalidatePath('/dashboard/coach/sessions');
    revalidatePath(`/dashboard/coach/attendance/${attendance.sessionId}`);

    console.log(`[SessionIntegration] Attendance recorded: ${attendance.id} for athlete ${attendance.athleteId}`);
  } catch (error) {
    console.error('[SessionIntegration] Error in onAttendanceRecorded:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to process attendance recording',
      { attendanceId: attendance.id }
    );
  }
}

/**
 * Gets all training sessions scheduled for today for a specific club.
 * Used for generating "Training today" recommendations.
 * 
 * @param clubId - The ID of the club
 * @returns Array of today's training sessions
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 2.2** - Today session recommendation
 */
export async function getTodaySessions(clubId: string): Promise<TrainingSession[]> {
  const db = await createClient();

  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: sessions, error } = await db
      .from('training_sessions')
      .select('*')
      .eq('club_id', clubId)
      .gte('session_date', today.toISOString())
      .lt('session_date', tomorrow.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    // Transform to TrainingSession type
    return (sessions || []).map((session: any) => ({
      id: session.id,
      clubId: session.club_id,
      coachId: session.coach_id,
      title: session.title || session.session_name || 'Training Session',
      description: session.description,
      sessionDate: session.session_date,
      startTime: session.start_time,
      endTime: session.end_time,
      location: session.location,
      maxParticipants: session.max_participants,
      status: session.status || 'scheduled',
      qrCode: session.qr_code,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    }));
  } catch (error) {
    console.error('[SessionIntegration] Error in getTodaySessions:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get today\'s sessions',
      { clubId }
    );
  }
}

/**
 * Gets all training sessions scheduled for tomorrow for a specific club.
 * Used for generating "Get ready for tomorrow" recommendations.
 * 
 * @param clubId - The ID of the club
 * @returns Array of tomorrow's training sessions
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 2.2** - Tomorrow session recommendation
 */
export async function getTomorrowSessions(clubId: string): Promise<TrainingSession[]> {
  const db = await createClient();

  try {
    // Get tomorrow's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const { data: sessions, error } = await db
      .from('training_sessions')
      .select('*')
      .eq('club_id', clubId)
      .gte('session_date', tomorrow.toISOString())
      .lt('session_date', dayAfterTomorrow.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    // Transform to TrainingSession type
    return (sessions || []).map((session: any) => ({
      id: session.id,
      clubId: session.club_id,
      coachId: session.coach_id,
      title: session.title || session.session_name || 'Training Session',
      description: session.description,
      sessionDate: session.session_date,
      startTime: session.start_time,
      endTime: session.end_time,
      location: session.location,
      maxParticipants: session.max_participants,
      status: session.status || 'scheduled',
      qrCode: session.qr_code,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    }));
  } catch (error) {
    console.error('[SessionIntegration] Error in getTomorrowSessions:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get tomorrow\'s sessions',
      { clubId }
    );
  }
}

/**
 * Gets upcoming sessions for a club within a specified number of days.
 * 
 * @param clubId - The ID of the club
 * @param days - Number of days to look ahead (default: 7)
 * @returns Array of upcoming training sessions
 */
export async function getUpcomingSessions(
  clubId: string,
  days: number = 7
): Promise<TrainingSession[]> {
  const db = await createClient();

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const { data: sessions, error } = await db
      .from('training_sessions')
      .select('*')
      .eq('club_id', clubId)
      .gte('session_date', today.toISOString())
      .lt('session_date', endDate.toISOString())
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    return (sessions || []).map((session: any) => ({
      id: session.id,
      clubId: session.club_id,
      coachId: session.coach_id,
      title: session.title || session.session_name || 'Training Session',
      description: session.description,
      sessionDate: session.session_date,
      startTime: session.start_time,
      endTime: session.end_time,
      location: session.location,
      maxParticipants: session.max_participants,
      status: session.status || 'scheduled',
      qrCode: session.qr_code,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    }));
  } catch (error) {
    console.error('[SessionIntegration] Error in getUpcomingSessions:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get upcoming sessions',
      { clubId }
    );
  }
}

/**
 * Gets the attendance status for an athlete in a specific session.
 * 
 * @param sessionId - The ID of the training session
 * @param athleteId - The ID of the athlete
 * @returns The attendance record or null if not found
 */
export async function getAthleteSessionAttendance(
  sessionId: string,
  athleteId: string
): Promise<AttendanceRecord | null> {
  const db = await createClient();

  try {
    const { data: attendance, error } = await (db as any)
      .from('attendance')
      .select('*')
      .eq('training_session_id', sessionId)
      .eq('athlete_id', athleteId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!attendance) {
      return null;
    }

    return {
      id: (attendance as any).id,
      sessionId: (attendance as any).training_session_id,
      athleteId: (attendance as any).athlete_id,
      status: (attendance as any).status,
      checkInTime: (attendance as any).check_in_time,
      checkInMethod: (attendance as any).check_in_method || 'manual',
      markedBy: (attendance as any).marked_by,
      notes: (attendance as any).notes,
      createdAt: (attendance as any).created_at,
      updatedAt: (attendance as any).updated_at,
    };
  } catch (error) {
    console.error('[SessionIntegration] Error in getAthleteSessionAttendance:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get athlete session attendance',
      { sessionId, athleteId }
    );
  }
}

/**
 * Checks if a session is happening today.
 * 
 * @param sessionDate - The session date string
 * @returns true if the session is today
 */
export async function isSessionToday(sessionDate: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const session = new Date(sessionDate);
  session.setHours(0, 0, 0, 0);
  return today.getTime() === session.getTime();
}

/**
 * Checks if a session is happening tomorrow.
 * 
 * @param sessionDate - The session date string
 * @returns true if the session is tomorrow
 */
export async function isSessionTomorrow(sessionDate: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const session = new Date(sessionDate);
  session.setHours(0, 0, 0, 0);
  return tomorrow.getTime() === session.getTime();
}

// Note: SessionIntegration object export removed because 'use server' files
// can only export async functions. Use the individual exported functions directly.