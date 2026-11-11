'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import {
  Activity,
  CheckInResult,
  CheckInStatus,
  ActivityIntegration,
  IntegrationError,
  IntegrationErrorType,
} from '@/types/integration';

/**
 * Activity Integration Module
 * 
 * Handles the integration between Coach activities and Athlete dashboard.
 * Implements the ActivityIntegration interface from the design document.
 * 
 * Features:
 * - Coach creates activity → Athletes in same club see it
 * - Athletes can check-in via QR code
 * - Check-in status updates both athlete and coach views
 * - Deadline tracking for activities
 */

/**
 * Called when a coach creates a new activity.
 * Triggers revalidation of athlete dashboards to show the new activity.
 * 
 * @param activity - The newly created activity
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 3.1** - Activity visibility in athlete activities list
 */
export async function onActivityCreated(activity: Activity): Promise<void> {
  try {
    // Revalidate athlete dashboard paths to show new activity
    revalidatePath('/dashboard/athlete');
    revalidatePath('/dashboard/athlete/activities');
    
    // Revalidate coach paths as well
    revalidatePath('/dashboard/coach/activities');
    
    console.log(`[ActivityIntegration] Activity created: ${activity.id}`);
  } catch (error) {
    console.error('[ActivityIntegration] Error in onActivityCreated:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to process activity creation',
      { activityId: activity.id }
    );
  }
}

/**
 * Called when an athlete scans a QR code to check-in to an activity.
 * Records the check-in and updates both athlete and coach dashboards.
 * 
 * @param activityId - The ID of the activity
 * @param athleteId - The ID of the athlete checking in
 * @returns CheckInResult with success status and message
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 3.2, 3.5** - QR check-in recording and status update
 */
export async function onQRCheckIn(
  activityId: string,
  athleteId: string
): Promise<CheckInResult> {
  const db = await createClient();

  try {
    // Verify activity exists
    const { data: activity, error: activityError } = await db
      .from('activities')
      .select('id, club_id, activity_date, start_time, end_time, status')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      throw new IntegrationError(
        IntegrationErrorType.ACTIVITY_NOT_FOUND,
        'Activity not found',
        { activityId }
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
        'Athlete profile not found',
        { athleteId }
      );
    }

    // @ts-ignore - Type inference issue
    if (athlete.club_id !== activity.club_id) {
      throw new IntegrationError(
        IntegrationErrorType.CLUB_MISMATCH,
        'Athletes are not in the same club as this activity',
        { athleteId, activityId }
      );
    }

    // Check if already checked in
    const { data: existingCheckin } = await (db as any)
      .from('activity_checkins')
      .select('id, checked_in_at')
      .eq('activity_id', activityId)
      .eq('athlete_id', athleteId)
      .maybeSingle();

    if (existingCheckin) {
      return {
        success: false,
        message: 'You have already checked in',
        checkInTime: (existingCheckin as any).checked_in_at,
      };
    }

    // Determine check-in status (on_time or late)
    const now = new Date();
    const activityDate = new Date((activity as any).activity_date);
    const [startHour, startMin] = ((activity as any).start_time || '00:00').split(':').map(Number);
    activityDate.setHours(startHour, startMin, 0, 0);
    
    const isLate = now > activityDate;
    const status = isLate ? 'late' : 'on_time';

    // Create check-in record
    const checkInTime = now.toISOString();
    const { error: insertError } = await (db as any)
      .from('activity_checkins')
      .insert({
        activity_id: activityId,
        athlete_id: athleteId,
        status: status,
        checked_in_at: checkInTime,
        checkin_method: 'qr',
      });

    if (insertError) {
      throw insertError;
    }

    // Revalidate both athlete and coach dashboards
    revalidatePath('/dashboard/athlete');
    revalidatePath('/dashboard/athlete/activities');
    revalidatePath('/dashboard/coach/activities');
    revalidatePath(`/dashboard/coach/activities/${activityId}`);

    console.log(`[ActivityIntegration] Athlete ${athleteId} checked in to activity ${activityId}`);

    return {
      success: true,
      message: isLate ? 'Check-in successful (late arrival)' : 'Check-in successful',
      checkInTime: checkInTime,
    };
  } catch (error) {
    if (error instanceof IntegrationError) {
      return {
        success: false,
        message: error.message,
      };
    }
    console.error('[ActivityIntegration] Error in onQRCheckIn:', error);
    return {
      success: false,
      message: 'An error occurred while checking in',
    };
  }
}

/**
 * Gets the check-in status for an athlete in a specific activity.
 * 
 * @param activityId - The ID of the activity
 * @param athleteId - The ID of the athlete
 * @returns CheckInStatus with isCheckedIn flag and checkInTime
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 3.5** - Check-in status display
 */
export async function getCheckInStatus(
  activityId: string,
  athleteId: string
): Promise<CheckInStatus> {
  const db = await createClient();

  try {
    const { data: checkin, error } = await (db as any)
      .from('activity_checkins')
      .select('id, checked_in_at')
      .eq('activity_id', activityId)
      .eq('athlete_id', athleteId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!checkin) {
      return {
        isCheckedIn: false,
        checkInTime: null,
      };
    }

    return {
      isCheckedIn: true,
      checkInTime: (checkin as any).checked_in_at,
    };
  } catch (error) {
    console.error('[ActivityIntegration] Error in getCheckInStatus:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get check-in status',
      { activityId, athleteId }
    );
  }
}

/**
 * Gets upcoming activities for a club.
 * 
 * @param clubId - The ID of the club
 * @param days - Number of days to look ahead (default: 30)
 * @returns Array of upcoming activities
 * 
 * **Validates: Requirements 3.1** - Activity visibility
 */
export async function getUpcomingActivities(
  clubId: string,
  days: number = 30
): Promise<Activity[]> {
  const db = await createClient();

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const { data: activities, error } = await db
      .from('activities')
      .select('*')
      .eq('club_id', clubId)
      .eq('status', 'scheduled')
      .gte('activity_date', today.toISOString().split('T')[0])
      .lte('activity_date', endDate.toISOString().split('T')[0])
      .order('activity_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    return (activities || []).map((activity: any) => ({
      id: activity.id,
      clubId: activity.club_id,
      coachId: activity.coach_id,
      title: activity.title,
      description: activity.description,
      activityDate: activity.activity_date,
      startTime: activity.start_time,
      endTime: activity.end_time,
      location: activity.location,
      qrCode: activity.qr_code_token,
      deadline: activity.registration_deadline,
      maxParticipants: activity.max_participants,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
    }));
  } catch (error) {
    console.error('[ActivityIntegration] Error in getUpcomingActivities:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get upcoming activities',
      { clubId }
    );
  }
}

/**
 * Gets today's activities for a club.
 * 
 * @param clubId - The ID of the club
 * @returns Array of today's activities
 * 
 * **Validates: Requirements 3.1** - Activity visibility
 */
export async function getTodayActivities(clubId: string): Promise<Activity[]> {
  const db = await createClient();

  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: activities, error } = await db
      .from('activities')
      .select('*')
      .eq('club_id', clubId)
      .eq('activity_date', today)
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    return (activities || []).map((activity: any) => ({
      id: activity.id,
      clubId: activity.club_id,
      coachId: activity.coach_id,
      title: activity.title,
      description: activity.description,
      activityDate: activity.activity_date,
      startTime: activity.start_time,
      endTime: activity.end_time,
      location: activity.location,
      qrCode: activity.qr_code_token,
      deadline: activity.registration_deadline,
      maxParticipants: activity.max_participants,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
    }));
  } catch (error) {
    console.error('[ActivityIntegration] Error in getTodayActivities:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get today\'s activities',
      { clubId }
    );
  }
}

/**
 * Calculates the remaining time until an activity deadline.
 * 
 * @param deadline - The deadline date string
 * @returns Object with remaining time info or null if no deadline
 * 
 * **Validates: Requirements 3.3** - Deadline display
 */
export function calculateRemainingTime(deadline: string | null): {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
  displayText: string;
} | null {
  if (!deadline) {
    return null;
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      isExpired: true,
      displayText: 'Time expired',
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let displayText = '';
  if (days > 0) {
    displayText = `${days} day(s) left`;
  } else if (hours > 0) {
    displayText = `${hours} hour(s) left`;
  } else {
    displayText = `${minutes} minute(s) left`;
  }

  return {
    days,
    hours,
    minutes,
    isExpired: false,
    displayText,
  };
}

/**
 * Gets the activity participants (athletes who checked in).
 * 
 * @param activityId - The ID of the activity
 * @returns Array of check-in records with athlete info
 * 
 * **Validates: Requirements 3.4** - Participant list
 */
export async function getActivityParticipants(activityId: string): Promise<Array<{
  athleteId: string;
  athleteName: string;
  checkInTime: string;
  status: string;
}>> {
  const db = await createClient();

  try {
    const { data: checkins, error } = await (db as any)
      .from('activity_checkins')
      .select(`
        id,
        athlete_id,
        checked_in_at,
        status,
        athletes (
          id,
          profiles (
            first_name,
            last_name
          )
        )
      `)
      .eq('activity_id', activityId)
      .order('checked_in_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (checkins || []).map((checkin: any) => ({
      athleteId: checkin.athlete_id,
      athleteName: checkin.athletes?.profiles 
        ? `${checkin.athletes.profiles.first_name} ${checkin.athletes.profiles.last_name}`
        : 'Unknown',
      checkInTime: checkin.checked_in_at,
      status: checkin.status,
    }));
  } catch (error) {
    console.error('[ActivityIntegration] Error in getActivityParticipants:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get activity participants',
      { activityId }
    );
  }
}

// Note: ActivityIntegration object export removed because 'use server' files
// can only export async functions. Use the individual exported functions directly.
