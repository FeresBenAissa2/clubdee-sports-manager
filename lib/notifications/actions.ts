'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';

export interface Notification {
  id: string;
  user_id: string;
  type: 'new_schedule' | 'schedule_reminder' | 'announcement' | 'test_result' | 'leave_approved' | 'leave_rejected';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  session_id?: string;
  announcement_id?: string;
  performance_id?: string;
  leave_request_id?: string;
}

/**
 * Get notifications for current user
 */
export async function getNotifications(limit = 50) {
  const db = await createClient();
  
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    return { data: null, error: 'User not found' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Notification[], error: null };
}

/**
 * Get unread notification count
 */
export async function getUnreadCount() {
  const db = await createClient();
  
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    return { count: 0, error: 'User not found' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (db as any)
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count || 0, error: null };
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string) {
  const db = await createClient();
  
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    return { error: 'User not found' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/athlete');
  return { error: null };
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead() {
  const db = await createClient();
  
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    return { error: 'User not found' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/athlete');
  return { error: null };
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string) {
  const db = await createClient();
  
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    return { error: 'User not found' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/athlete');
  return { error: null };
}
