'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';

export interface CreateFeedbackInput {
  training_log_id: string;
  feedback_text: string;
  rating?: number;
  improvement_areas?: string[];
  next_steps?: string;
}

export async function getPendingHomeTrainingReviews() {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  const { data: profile } = await db
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single<{ id: string; role: string }>();

  if (!profile || profile.role !== 'coach') {
    return { error: 'Only coaches can view this list' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).rpc('get_coach_pending_home_training_reviews', {
    p_coach_id: profile.id,
  });

  if (error) {
    console.error('Error fetching pending reviews:', error);
    return { error: 'Could not load pending home training submissions' };
  }

  return { data };
}

export async function getClubHomeTrainingLogs(filters?: {
  status?: string;
  athlete_id?: string;
  start_date?: string;
  end_date?: string;
}) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  const { data: profile } = await db
    .from('profiles')
    .select('id, club_id, role')
    .eq('user_id', user.id)
    .single<{ id: string; club_id: string | null; role: string }>();

  if (!profile || profile.role !== 'coach') {
    return { error: 'Only coaches can view this list' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from('home_training_logs')
    .select(`
      *,
      athlete:profiles!home_training_logs_athlete_id_fkey(id, full_name, profile_picture_url),
      reviewer:profiles!home_training_logs_reviewed_by_fkey(full_name)
    `)
    .eq('club_id', profile.club_id);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.athlete_id) {
    query = query.eq('athlete_id', filters.athlete_id);
  }

  if (filters?.start_date) {
    query = query.gte('training_date', filters.start_date);
  }

  if (filters?.end_date) {
    query = query.lte('training_date', filters.end_date);
  }

  const { data, error } = await query.order('training_date', { ascending: false });

  if (error) {
    console.error('Error fetching club training logs:', error);
    return { error: 'Could not load home training data' };
  }

  return { data };
}

export async function reviewHomeTrainingLog(
  logId: string,
  status: 'reviewed' | 'approved' | 'needs_improvement'
) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single<{ id: string }>();

  if (!profile) {
    return { error: 'Profile not found' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('home_training_logs')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
    })
    .eq('id', logId)
    .select()
    .single();

  if (error) {
    console.error('Error reviewing training log:', error);
    return { error: 'Could not review home training submission' };
  }

  revalidatePath('/dashboard/coach/home-training');
  return { data };
}

export async function createHomeTrainingFeedback(input: CreateFeedbackInput) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  const { data: profile } = await db
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single<{ id: string; role: string }>();

  if (!profile || profile.role !== 'coach') {
    return { error: 'Only coaches can leave feedback' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('home_training_feedback')
    .insert({
      ...input,
      coach_id: profile.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating feedback:', error);
    return { error: 'Could not create feedback' };
  }

  // Also update the training log status
  await reviewHomeTrainingLog(input.training_log_id, 'reviewed');

  revalidatePath('/dashboard/coach/home-training');
  return { data };
}

export async function updateHomeTrainingFeedback(
  feedbackId: string,
  updates: Partial<CreateFeedbackInput>
) {
  const db = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('home_training_feedback')
    .update(updates)
    .eq('id', feedbackId)
    .select()
    .single();

  if (error) {
    console.error('Error updating feedback:', error);
    return { error: 'Could not update feedback' };
  }

  revalidatePath('/dashboard/coach/home-training');
  return { data };
}

export async function deleteHomeTrainingFeedback(feedbackId: string) {
  const db = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('home_training_feedback')
    .delete()
    .eq('id', feedbackId);

  if (error) {
    console.error('Error deleting feedback:', error);
    return { error: 'Could not delete feedback' };
  }

  revalidatePath('/dashboard/coach/home-training');
  return { success: true };
}

export async function getAthleteHomeTrainingHistory(athleteId: string, days: number = 30) {
  const db = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('home_training_logs')
    .select(`
      *,
      feedback:home_training_feedback(*)
    `)
    .eq('athlete_id', athleteId)
    .gte('training_date', startDate.toISOString().split('T')[0])
    .order('training_date', { ascending: false });

  if (error) {
    console.error('Error fetching athlete training history:', error);
    return { error: 'Could not load training history' };
  }

  return { data };
}
