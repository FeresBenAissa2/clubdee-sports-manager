'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';

/**
 * Add feedback to attendance log
 */
export async function addAttendanceFeedback(
  attendanceLogId: string,
  feedback: string
) {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get coach profile
  const { data: coach } = await (db as any)
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    return { success: false, error: 'Coach profile not found' };
  }

  // Update attendance log with feedback
  const { error } = await (db as any)
    .from('attendance')
    .update({ coach_feedback: feedback })
    .eq('id', attendanceLogId);

  if (error) {
    console.error('Error adding attendance feedback:', error);
    return { success: false, error: 'Failed to add feedback' };
  }

  revalidatePath('/dashboard/coach/attendance');
  revalidatePath('/dashboard/athlete/attendance');

  return { success: true };
}

/**
 * Add notes to performance record
 */
export async function addPerformanceNotes(
  performanceRecordId: string,
  notes: string
) {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get coach profile
  const { data: coach } = await (db as any)
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    return { success: false, error: 'Coach profile not found' };
  }

  // Update performance record with notes
  const { error } = await (db as any)
    .from('performance_records')
    .update({ coach_notes: notes })
    .eq('id', performanceRecordId)
    .eq('coach_id', coach.id);

  if (error) {
    console.error('Error adding performance notes:', error);
    return { success: false, error: 'Failed to add notes' };
  }

  revalidatePath('/dashboard/coach/performance');
  revalidatePath('/dashboard/athlete/performance');

  return { success: true };
}
