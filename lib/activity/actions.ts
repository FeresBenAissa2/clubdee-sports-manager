'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';

// ============================================================================
// Activity Management Actions
// ============================================================================

export async function createActivity(formData: {
  title: string;
  description?: string;
  activity_type: 'training' | 'competition' | 'practice' | 'other';
  activity_date: string;
  start_time: string;
  end_time: string;
  location: string;
  max_participants?: number;
  requires_registration: boolean;
  checkin_window_before?: number;
  checkin_window_after?: number;
}) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  // Get coach profile
  const { data: coach } = await db
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    return { error: 'Coach profile not found' };
  }

  // Create activity
  const { data: activity, error } = await (db as any)
    .from('activities')
    .insert({
      club_id: (coach as any).club_id,
      coach_id: (coach as any).id,
      ...formData,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/coach/activities');
  return { data: activity };
}

export async function generateQRCode(activityId: string) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  // Verify coach owns this activity
  const { data: activity } = await db
    .from('activities')
    .select('id, coach_id, coaches!inner(user_id)')
    .eq('id', activityId)
    .single();

  if (!activity || (activity as any).coaches.user_id !== user.id) {
    return { error: 'You do not have access to this activity' };
  }

  // Generate QR token using database function
  const { data, error } = await (db as any).rpc('generate_activity_qr_token', {
    p_activity_id: activityId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/coach/activities/${activityId}`);
  return { data: { token: data } };
}

// ============================================================================
// Registration Actions
// ============================================================================

export async function registerForActivity(activityId: string, notes?: string) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  // Get athlete profile
  const { data: athlete } = await (db as any)
    .from('athletes')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!athlete) {
    return { error: 'Athlete profile not found' };
  }

  // Check if activity requires registration
  const { data: activity } = await (db as any)
    .from('activities')
    .select('requires_registration, max_participants')
    .eq('id', activityId)
    .single();

  if (!activity) {
    return { error: 'Activity not found' };
  }

  if (!(activity as any).requires_registration) {
    return { error: 'This activity does not require advance registration' };
  }

  // Check if already registered
  const { data: existing } = await (db as any)
    .from('activity_registrations')
    .select('id, status')
    .eq('activity_id', activityId)
    .eq('athlete_id', (athlete as any).id)
    .single();

  if (existing) {
    return { error: 'You are already registered for this activity' };
  }

  // Check if activity is full
  const { data: isFull } = await (db as any).rpc('is_activity_full', {
    p_activity_id: activityId,
  });

  if (isFull) {
    return { error: 'This activity is full' };
  }

  // Create registration
  const { data: registration, error } = await (db as any)
    .from('activity_registrations')
    .insert({
      activity_id: activityId,
      athlete_id: (athlete as any).id,
      athlete_notes: notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/athlete/activities');
  return { data: registration };
}

export async function cancelRegistration(registrationId: string) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  const { error } = await (db as any)
    .from('activity_registrations')
    .update({ status: 'cancelled' })
    .eq('id', registrationId)
    .eq('status', 'pending');

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/athlete/activities');
  return { success: true };
}

export async function approveRegistration(registrationId: string, coachNotes?: string) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  // Get coach profile
  const { data: coach } = await db
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    return { error: 'Coach profile not found' };
  }

  const { error } = await (db as any)
    .from('activity_registrations')
    .update({
      status: 'approved',
      approved_by: (coach as any).id,
      approved_at: new Date().toISOString(),
      coach_notes: coachNotes,
    })
    .eq('id', registrationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/coach/activities');
  return { success: true };
}

export async function rejectRegistration(registrationId: string, reason: string) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  // Get coach profile
  const { data: coach } = await db
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    return { error: 'Coach profile not found' };
  }

  const { error } = await (db as any)
    .from('activity_registrations')
    .update({
      status: 'rejected',
      approved_by: (coach as any).id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', registrationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/coach/activities');
  return { success: true };
}

export async function removeAthleteFromActivity(registrationId: string) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  const { error } = await (db as any)
    .from('activity_registrations')
    .delete()
    .eq('id', registrationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/coach/activities');
  return { success: true };
}

// ============================================================================
// Check-in Actions
// ============================================================================

export async function checkInWithQR(activityId: string, qrToken: string) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  // Get athlete profile
  const { data: athlete } = await (db as any)
    .from('athletes')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!athlete) {
    return { error: 'Athlete profile not found' };
  }

  // Verify QR token
  const { data: activity } = await (db as any)
    .from('activities')
    .select('id, qr_code_token, qr_code_expires_at')
    .eq('id', activityId)
    .single();

  if (!activity) {
    return { error: 'Activity not found' };
  }

  if ((activity as any).qr_code_token !== qrToken) {
    return { error: 'Invalid QR code' };
  }

  if ((activity as any).qr_code_expires_at && new Date((activity as any).qr_code_expires_at) < new Date()) {
    return { error: 'QR code has expired' };
  }

  // Check if within check-in window
  const { data: isValid } = await (db as any).rpc('is_checkin_window_valid', {
    p_activity_id: activityId,
  });

  if (!isValid) {
    return { error: 'Outside the check-in time window' };
  }

  // Check if already checked in
  const { data: existing } = await (db as any)
    .from('activity_checkins')
    .select('id')
    .eq('activity_id', activityId)
    .eq('athlete_id', (athlete as any).id)
    .single();

  if (existing) {
    return { error: 'You have already checked in' };
  }

  // Determine status (on_time or late)
  const { data: status } = await (db as any).rpc('determine_checkin_status', {
    p_activity_id: activityId,
  });

  // Create check-in record
  const { data: checkin, error } = await (db as any)
    .from('activity_checkins')
    .insert({
      activity_id: activityId,
      athlete_id: (athlete as any).id,
      status: status || 'on_time',
      checkin_method: 'qr',
      qr_token_used: qrToken,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/athlete/activities');
  return { data: checkin };
}

export async function checkOutFromActivity(activityId: string) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  // Get athlete profile
  const { data: athlete } = await (db as any)
    .from('athletes')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!athlete) {
    return { error: 'Athlete profile not found' };
  }

  // Update check-out time
  const { error } = await (db as any)
    .from('activity_checkins')
    .update({ checked_out_at: new Date().toISOString() })
    .eq('activity_id', activityId)
    .eq('athlete_id', (athlete as any).id)
    .is('checked_out_at', null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/athlete/activities');
  return { success: true };
}
