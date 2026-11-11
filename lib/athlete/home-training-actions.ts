'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';

export interface HomeTrainingLog {
  id: string;
  athlete_id: string;
  club_id: string;
  training_date: string;
  training_type: string;
  duration_minutes: number;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  notes: string | null;
  video_url: string | null;
  video_duration_seconds: number | null;
  status: 'pending' | 'reviewed' | 'approved' | 'needs_improvement';
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeTrainingFeedback {
  id: string;
  training_log_id: string;
  coach_id: string;
  feedback_text: string;
  rating: number | null;
  improvement_areas: string[] | null;
  next_steps: string | null;
  created_at: string;
  coach_name?: string;
}

export interface CreateHomeTrainingLogInput {
  training_date: string;
  training_type: string;
  duration_minutes: number;
  exercise_name: string;
  sets?: number;
  reps?: number;
  notes?: string;
  video_url?: string;
  video_duration_seconds?: number;
}

export async function createHomeTrainingLog(input: CreateHomeTrainingLogInput) {
  const db = await createClient();

  // Get current user's profile
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  const { data: profile } = await db
    .from('profiles')
    .select('id, club_id, role')
    .eq('user_id', user.id)
    .single<{ id: string; club_id: string | null; role: string }>();

  if (!profile || profile.role !== 'athlete') {
    return { error: 'Only athletes can log home training' };
  }

  if (!profile.club_id) {
    return { error: 'Please join a club before logging home training' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('home_training_logs')
    .insert({
      athlete_id: profile.id,
      club_id: profile.club_id,
      ...input,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating home training log:', error);
    return { error: 'Could not save home training' };
  }

  revalidatePath('/dashboard/athlete/home-training');
  return { data };
}

export async function getMyHomeTrainingLogs() {
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
    .select('*')
    .eq('athlete_id', profile.id)
    .order('training_date', { ascending: false });

  if (error) {
    console.error('Error fetching home training logs:', error);
    return { error: 'Could not load home training data' };
  }

  return { data };
}

export async function getHomeTrainingLogById(logId: string) {
  const db = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('home_training_logs')
    .select(`
      *,
      athlete:profiles!home_training_logs_athlete_id_fkey(full_name, profile_picture_url),
      reviewer:profiles!home_training_logs_reviewed_by_fkey(full_name)
    `)
    .eq('id', logId)
    .single();

  if (error) {
    console.error('Error fetching home training log:', error);
    return { error: 'Could not load home training data' };
  }

  return { data };
}

export async function updateHomeTrainingLog(
  logId: string,
  updates: Partial<CreateHomeTrainingLogInput>
) {
  const db = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('home_training_logs')
    .update(updates)
    .eq('id', logId)
    .eq('status', 'pending') // Only allow updating pending logs
    .select()
    .single();

  if (error) {
    console.error('Error updating home training log:', error);
    return { error: 'Could not update home training' };
  }

  revalidatePath('/dashboard/athlete/home-training');
  return { data };
}

export async function deleteHomeTrainingLog(logId: string) {
  const db = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('home_training_logs')
    .delete()
    .eq('id', logId)
    .eq('status', 'pending'); // Only allow deleting pending logs

  if (error) {
    console.error('Error deleting home training log:', error);
    return { error: 'Could not delete home training' };
  }

  revalidatePath('/dashboard/athlete/home-training');
  return { success: true };
}

export async function getHomeTrainingFeedback(logId: string) {
  const db = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('home_training_feedback')
    .select(`
      *,
      coach:profiles!home_training_feedback_coach_id_fkey(full_name, profile_picture_url)
    `)
    .eq('training_log_id', logId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching feedback:', error);
    return { error: 'Could not load feedback' };
  }

  return { data };
}

export async function getHomeTrainingStats(days: number = 30) {
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

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).rpc('get_athlete_home_training_stats', {
    p_athlete_id: profile.id,
    p_start_date: startDate.toISOString().split('T')[0],
    p_end_date: new Date().toISOString().split('T')[0],
  });

  if (error) {
    console.error('Error fetching training stats:', error);
    return { error: 'Could not load training statistics' };
  }

  return { data: data?.[0] || null };
}

export async function uploadHomeTrainingVideo(file: File) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { error: 'User not found' };
  }

  // Validate file type
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only video files are supported (MP4, MOV, AVI, WebM)' };
  }

  // Validate file size (100MB)
  if (file.size > 100 * 1024 * 1024) {
    return { error: 'File size must not exceed 100MB' };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const { data, error } = await db.storage
    .from('home-training-videos')
    .upload(fileName, file);

  if (error) {
    console.error('Error uploading video:', error);
    return { error: 'Could not upload video' };
  }

  // Get public URL
  const { data: urlData } = db.storage
    .from('home-training-videos')
    .getPublicUrl(data.path);

  return { data: { path: data.path, url: urlData.publicUrl } };
}

export async function deleteHomeTrainingVideo(path: string) {
  const db = await createClient();

  const { error } = await db.storage
    .from('home-training-videos')
    .remove([path]);

  if (error) {
    console.error('Error deleting video:', error);
    return { error: 'Could not delete video' };
  }

  return { success: true };
}
