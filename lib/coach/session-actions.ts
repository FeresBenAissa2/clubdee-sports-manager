'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/lib/audit/actions';
import { Database } from '@/types/database.types';
import { invalidatePattern } from '@/lib/utils/cache';
import { sanitizeInput } from '@/lib/utils/sanitization';
import { 
  validateRequired, 
  validateLength, 
  validateDateRange,
  validateTimeRange 
} from '@/lib/utils/enhanced-validation';

type TrainingSession = Database['public']['Tables']['training_sessions']['Row'];
type TrainingSessionInsert = Database['public']['Tables']['training_sessions']['Insert'];
type TrainingSessionUpdate = Database['public']['Tables']['training_sessions']['Update'];
type Coach = Database['public']['Tables']['coaches']['Row'];

/**
 * Create a new training session
 */
export async function createSession(data: {
  title: string;
  description?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
}): Promise<{ success?: boolean; data?: TrainingSession; error?: string }> {
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

    // Comprehensive input validation
    const titleError = validateRequired(data.title, 'Training session title') || 
                       validateLength(data.title, 3, 200, 'Training session title');
    if (titleError) {
      return { error: titleError.message };
    }

    const locationError = validateRequired(data.location, 'Location') || 
                          validateLength(data.location, 2, 200, 'Location');
    if (locationError) {
      return { error: locationError.message };
    }

    if (data.description) {
      const descError = validateLength(data.description, 0, 1000, 'Details');
      if (descError) {
        return { error: descError.message };
      }
    }

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateError = validateDateRange(data.session_date, today, undefined, 'Training date');
    if (dateError) {
      return { error: dateError.message };
    }

    // Validate time range
    const timeError = validateTimeRange(data.start_time, data.end_time);
    if (timeError) {
      return { error: timeError.message };
    }

    // Sanitize inputs to prevent XSS
    const sanitizedTitle = sanitizeInput(data.title);
    const sanitizedLocation = sanitizeInput(data.location);
    const sanitizedDescription = data.description ? sanitizeInput(data.description) : null;

    // Create session with sanitized data
    // Note: coach_id in training_sessions references auth.users(id), not coaches(id)
    const coachData = coach as Coach;
    const sessionData = {
      club_id: coachData.club_id,
      coach_id: coachData.user_id, // Use user_id since FK references auth.users
      created_by: user.id, // Required for RLS policy check
      title: sanitizedTitle,
      description: sanitizedDescription,
      session_date: data.session_date,
      start_time: data.start_time,
      end_time: data.end_time,
      location: sanitizedLocation,
    };

    // Type assertion needed until TypeScript picks up the new database types
    const { data: session, error: insertError } = await (db
      .from('training_sessions') as any)
      .insert(sessionData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return { error: 'An error occurred while scheduling the training session' };
    }

    // Log audit event
    await createAuditLog({
      userId: user.id,
      actionType: 'training_session.create',
      entityType: 'training_session',
      // @ts-ignore
      entityId: session.id,
      details: sessionData,
    });

    revalidatePath('/dashboard/coach/sessions');

    // Invalidate stats cache
    invalidatePattern('attendance-stats:.*');
    invalidatePattern('club-stats:.*');

    return { success: true, data: session };
  } catch (error) {
    console.error('Unexpected error in createSession:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update an existing training session
 */
export async function updateSession(
  sessionId: string,
  data: {
    title?: string;
    description?: string;
    session_date?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
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

    // Verify session belongs to coach
    const { data: session, error: sessionError } = await db
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return { error: 'Training session not found' };
    }

    // Note: coach_id references auth.users(id), so compare with user_id
    // @ts-ignore
    if (session.coach_id !== coach.user_id) {
      return { error: 'Unauthorized: You cannot edit another coach\'s schedule' };
    }

    // Validate input
    if (data.title !== undefined && data.title.trim().length === 0) {
      return { error: 'Training session title cannot be empty' };
    }

    if (data.location !== undefined && data.location.trim().length === 0) {
      return { error: 'Location is required' };
    }

    // Validate date is not in the past
    if (data.session_date) {
      const sessionDate = new Date(data.session_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (sessionDate < today) {
        return { error: 'Cannot set a date in the past' };
      }
    }

    // Validate start_time < end_time
    // @ts-ignore
    const startTime = data.start_time || session.start_time;
    // @ts-ignore
    const endTime = data.end_time || session.end_time;
    
    if (startTime >= endTime) {
      return { error: 'Start time must be before end time' };
    }

    // Prepare update data
    const updateData: TrainingSessionUpdate = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description.trim() || null;
    if (data.session_date !== undefined) updateData.session_date = data.session_date;
    if (data.start_time !== undefined) updateData.start_time = data.start_time;
    if (data.end_time !== undefined) updateData.end_time = data.end_time;
    if (data.location !== undefined) updateData.location = data.location.trim();

    // Update session
    // @ts-ignore - type inference issue
    // Type assertion needed until TypeScript picks up the new database types
    const { error: updateError } = await (db
      .from('training_sessions') as any)
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { error: 'An error occurred while updating the training session' };
    }

    // Log audit event
    await createAuditLog({
      userId: user.id,
      actionType: 'training_session.update',
      entityType: 'training_session',
      entityId: sessionId,
      details: updateData,
    });

    revalidatePath('/dashboard/coach/sessions');
    revalidatePath(`/dashboard/coach/sessions/${sessionId}`);

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateSession:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Cancel a training session
 * Can only cancel if at least 2 hours before start time
 */
export async function cancelSession(sessionId: string): Promise<{ success?: boolean; error?: string }> {
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
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return { error: 'Training session not found' };
    }

    // Note: coach_id references auth.users(id), so compare with user_id
    // @ts-ignore
    if (session.coach_id !== coach.user_id) {
      return { error: 'Unauthorized: You cannot cancel another coach\'s schedule' };
    }

    // Check if session is at least 2 hours in the future
    // @ts-ignore
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    if (sessionDateTime < twoHoursFromNow) {
      return { error: 'Cannot cancel session. Cancel at least 2 hours before start time' };
    }

    // Delete session (soft delete by updating status would be better in production)
    const { error: deleteError } = await db
      .from('training_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return { error: 'An error occurred while canceling the training session' };
    }

    // Log audit event
    await createAuditLog({
      userId: user.id,
      actionType: 'training_session.delete',
      entityType: 'training_session',
      entityId: sessionId,
      details: { cancelled_at: new Date().toISOString() },
    });

    revalidatePath('/dashboard/coach/sessions');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in cancelSession:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get all training sessions for a coach
 * OPTIMIZED: Added pagination support
 */
export async function getCoachSessions(filter?: {
  upcoming?: boolean;
  past?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data?: TrainingSession[]; total?: number; error?: string }> {
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

    // Build query with pagination
    const limit = filter?.limit || 100; // Default limit
    const offset = filter?.offset || 0;

    // Note: coach_id in training_sessions references auth.users(id), not coaches(id)
    // So we use coach.user_id to match
    // @ts-ignore
    let query = db
      .from('training_sessions')
      .select('*', { count: 'exact' })
      // @ts-ignore
      .eq('coach_id', coach.user_id) // Use user_id since FK references auth.users
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
      console.error('Query error:', sessionsError);
      return { error: 'An error occurred while loading training sessions' };
    }

    return { data: sessions, total: count || 0 };
  } catch (error) {
    console.error('Unexpected error in getCoachSessions:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get a single training session with details
 */
export async function getSessionDetails(sessionId: string): Promise<{
  data?: TrainingSession & { attendance_count?: number };
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

    // Get session
    const { data: session, error: sessionError } = await db
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return { error: 'Training session not found' };
    }

    // Get attendance count
    const { count, error: countError } = await db
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('training_session_id', sessionId)
      .eq('status', 'present');

    if (countError) {
      console.error('Count error:', countError);
    }

    return {
      data: {
        // @ts-ignore
        ...session,
        attendance_count: count || 0,
      },
    };
  } catch (error) {
    console.error('Unexpected error in getSessionDetails:', error);
    return { error: 'An unexpected error occurred' };
  }
}
