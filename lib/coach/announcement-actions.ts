'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import { sanitizeHtml, sanitizeInput } from '@/lib/utils/sanitization';
import { validateRequired, validateLength, validateEnum } from '@/lib/utils/enhanced-validation';

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  target_audience?: 'all' | 'athletes' | 'specific';
  is_pinned?: boolean;
  expires_at?: string;
  /** Which of the coach's clubs the announcement is for (defaults to the first one). */
  club_id?: string;
}

export interface UpdateAnnouncementInput extends Partial<Omit<CreateAnnouncementInput, 'club_id'>> {
  id: string;
}

/**
 * The announcement, if the signed-in user may change it: its author (any of the
 * coach's club rows) or an admin. Without this check any coach could edit or
 * delete another coach's announcement.
 */
async function ownedAnnouncement(
  db: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  announcementId: string
): Promise<{ id: string; coach_id: string } | null> {
  const { data: announcement } = await db
    .from('announcements')
    .select('id, coach_id')
    .eq('id', announcementId)
    .maybeSingle();
  if (!announcement) return null;

  const [{ data: coachRows }, { data: role }] = await Promise.all([
    db.from('coaches').select('id').eq('user_id', userId),
    db.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
  ]);
  const coachIds = ((coachRows ?? []) as { id: string }[]).map((row) => row.id);
  const isAdmin = (role as { role?: string } | null)?.role === 'admin';
  const row = announcement as { id: string; coach_id: string };
  return isAdmin || coachIds.includes(row.coach_id) ? row : null;
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Validate and sanitize input
  const titleError = validateRequired(input.title, 'Announcement title') ||
                     validateLength(input.title, 3, 200, 'Announcement title');
  if (titleError) {
    return { success: false, error: titleError.message };
  }

  const messageError = validateRequired(input.message, 'Details') ||
                       validateLength(input.message, 10, 5000, 'Details');
  if (messageError) {
    return { success: false, error: messageError.message };
  }

  if (input.priority) {
    const priorityError = validateEnum(
      input.priority,
      ['low', 'normal', 'high', 'urgent'],
      'Priority level'
    );
    if (priorityError) {
      return { success: false, error: priorityError.message };
    }
  }

  // Sanitize inputs to prevent XSS
  const sanitizedTitle = sanitizeInput(input.title);
  const sanitizedMessage = sanitizeHtml(input.message);

  // Get the coach's row for the chosen club (a coach has one row per club)
  let coachQuery = db.from('coaches').select('id, club_id').eq('user_id', user.id);
  if (input.club_id) coachQuery = coachQuery.eq('club_id', input.club_id);
  const { data: coach, error: coachError } = await coachQuery
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (coachError || !coach) {
    return {
      success: false,
      error: input.club_id ? 'You can only post announcements to your own clubs' : 'Coach profile not found',
    };
  }

  // Create announcement with sanitized data
  const { data, error } = await (db as any)
    .from('announcements')
    .insert({
      coach_id: (coach as any).id,
      club_id: (coach as any).club_id,
      created_by: user.id,
      title: sanitizedTitle,
      message: sanitizedMessage,
      priority: input.priority || 'normal',
      target_audience: input.target_audience || 'all',
      is_pinned: input.is_pinned || false,
      expires_at: input.expires_at || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating announcement:', error);
    return { success: false, error: 'Could not create announcement' };
  }

  revalidatePath('/dashboard/coach');
  revalidatePath('/dashboard/coach/announcements');
  revalidatePath('/dashboard/athlete');

  return { success: true, data };
}

export async function updateAnnouncement(input: UpdateAnnouncementInput) {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const { id, ...updates } = input;

  // Validate if provided
  if (updates.title !== undefined) {
    const titleError = validateRequired(updates.title, 'Announcement title') ||
                       validateLength(updates.title, 3, 200, 'Announcement title');
    if (titleError) {
      return { success: false, error: titleError.message };
    }
    updates.title = sanitizeInput(updates.title);
  }

  if (updates.message !== undefined) {
    const messageError = validateRequired(updates.message, 'Details') ||
                         validateLength(updates.message, 10, 5000, 'Details');
    if (messageError) {
      return { success: false, error: messageError.message };
    }
    updates.message = sanitizeHtml(updates.message);
  }

  if (updates.priority !== undefined) {
    const priorityError = validateEnum(
      updates.priority,
      ['low', 'normal', 'high', 'urgent'],
      'Priority level'
    );
    if (priorityError) {
      return { success: false, error: priorityError.message };
    }
  }

  if (!(await ownedAnnouncement(db, user.id, id))) {
    return { success: false, error: 'You can only edit your own announcements' };
  }

  const { data, error } = await (db as any)
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating announcement:', error);
    return { success: false, error: 'Could not update announcement' };
  }

  revalidatePath('/dashboard/coach');
  revalidatePath('/dashboard/coach/announcements');
  revalidatePath('/dashboard/athlete');

  return { success: true, data };
}

export async function deleteAnnouncement(id: string) {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!(await ownedAnnouncement(db, user.id, id))) {
    return { success: false, error: 'You can only delete your own announcements' };
  }

  const { error } = await db.from('announcements').delete().eq('id', id);

  if (error) {
    console.error('Error deleting announcement:', error);
    return { success: false, error: 'Could not delete announcement' };
  }

  revalidatePath('/dashboard/coach');
  revalidatePath('/dashboard/coach/announcements');
  revalidatePath('/dashboard/athlete');

  return { success: true };
}

export async function getCoachAnnouncements() {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not found', data: [] };
  }

  // All of the coach's club rows (a coach has one row per club)
  const { data: coachRows } = await db.from('coaches').select('id').eq('user_id', user.id);
  const coachIds = ((coachRows ?? []) as { id: string }[]).map((row) => row.id);

  if (coachIds.length === 0) {
    return { success: false, error: 'Coach profile not found', data: [] };
  }

  // Get announcements with read statistics
  const { data, error } = await (db as any)
    .from('announcements')
    .select(
      `
      *,
      announcement_reads(count)
    `
    )
    .in('coach_id', coachIds)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching announcements:', error);
    return { success: false, error: 'Could not load announcements', data: [] };
  }

  return { success: true, data: data || [] };
}

export async function markAnnouncementAsRead(announcementId: string) {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Insert or ignore if already exists
  const { error } = await (db as any)
    .from('announcement_reads')
    .upsert(
      {
        announcement_id: announcementId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      },
      {
        onConflict: 'announcement_id,user_id',
      }
    );

  if (error) {
    console.error('Error marking announcement as read:', error);
    return { success: false, error: 'Cannot mark as read' };
  }

  return { success: true };
}
