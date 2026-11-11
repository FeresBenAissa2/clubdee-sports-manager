'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import {
  Announcement,
  AnnouncementIntegration,
  IntegrationError,
  IntegrationErrorType,
} from '@/types/integration';

/**
 * Announcement Integration Module
 * 
 * Handles the integration between Coach announcements and Athlete dashboard.
 * Implements the AnnouncementIntegration interface from the design document.
 * 
 * Features:
 * - Coach creates announcement → Athletes in same club see it
 * - Athletes can mark announcements as read
 * - Unread count for badge display
 */

/**
 * Called when a coach creates a new announcement.
 * Triggers revalidation of athlete dashboards to show the new announcement.
 * 
 * @param announcement - The newly created announcement
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 1.1** - Announcement visibility within 5 seconds
 */
export async function onAnnouncementCreated(announcement: Announcement): Promise<void> {
  try {
    // Revalidate athlete dashboard paths to show new announcement
    revalidatePath('/dashboard/athlete');
    revalidatePath('/dashboard/athlete/announcements');
    
    // If club-specific, we could trigger real-time notifications here
    // For now, Next.js revalidation handles the update
    
    console.log(`[AnnouncementIntegration] Announcement created: ${announcement.id}`);
  } catch (error) {
    console.error('[AnnouncementIntegration] Error in onAnnouncementCreated:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to process announcement creation',
      { announcementId: announcement.id }
    );
  }
}

/**
 * Called when an athlete reads an announcement.
 * Records the read status and updates the unread count.
 * 
 * @param announcementId - The ID of the announcement being read
 * @param userId - The ID of the user reading the announcement
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 1.2** - Read status tracking
 */
export async function onAnnouncementRead(
  announcementId: string,
  userId: string
): Promise<void> {
  const db = await createClient();

  try {
    // Upsert the read status (insert or update if exists)
    const { error } = await (db as any)
      .from('announcement_reads')
      .upsert(
        {
          announcement_id: announcementId,
          user_id: userId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: 'announcement_id,user_id',
        }
      );

    if (error) {
      throw error;
    }

    // Revalidate to update badge counts
    revalidatePath('/dashboard/athlete');
    revalidatePath('/dashboard/athlete/announcements');

    console.log(`[AnnouncementIntegration] Announcement ${announcementId} marked as read by ${userId}`);
  } catch (error) {
    console.error('[AnnouncementIntegration] Error in onAnnouncementRead:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to mark announcement as read',
      { announcementId, userId }
    );
  }
}

/**
 * Gets the count of unread announcements for a user in a specific club.
 * Used for displaying badge counts on the athlete dashboard.
 * 
 * @param userId - The ID of the user
 * @param clubId - The ID of the club
 * @returns The number of unread announcements
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 1.4** - Unread badge count accuracy
 */
export async function getUnreadCount(userId: string, clubId: string): Promise<number> {
  const db = await createClient();

  try {
    // First, get all coaches from the club
    const { data: clubCoaches, error: coachError } = await db
      .from('coaches')
      .select('id')
      .eq('club_id', clubId);

    if (coachError) {
      throw coachError;
    }

    if (!clubCoaches || clubCoaches.length === 0) {
      return 0;
    }

    const coachIds = clubCoaches.map((c: { id: string }) => c.id);

    // Get all announcements from club coaches that are not expired
    const now = new Date().toISOString();
    const { data: announcements, error: annError } = await (db as any)
      .from('announcements')
      .select(`
        id,
        announcement_reads!left(user_id)
      `)
      .in('coach_id', coachIds)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (annError) {
      throw annError;
    }

    if (!announcements || announcements.length === 0) {
      return 0;
    }

    // Count announcements that the user hasn't read
    const unreadCount = announcements.filter(
      (ann: any) => !ann.announcement_reads?.some((read: any) => read.user_id === userId)
    ).length;

    return unreadCount;
  } catch (error) {
    console.error('[AnnouncementIntegration] Error in getUnreadCount:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get unread announcement count',
      { userId, clubId }
    );
  }
}

/**
 * Gets all announcements for a user's club with read status.
 * 
 * @param userId - The ID of the user
 * @param clubId - The ID of the club
 * @returns Array of announcements with read status
 */
export async function getAnnouncementsWithReadStatus(
  userId: string,
  clubId: string
): Promise<Array<Announcement & { isRead: boolean; isUrgent: boolean }>> {
  const db = await createClient();

  try {
    // Get all coaches from the club
    const { data: clubCoaches, error: coachError } = await db
      .from('coaches')
      .select('id')
      .eq('club_id', clubId);

    if (coachError) {
      throw coachError;
    }

    if (!clubCoaches || clubCoaches.length === 0) {
      return [];
    }

    const coachIds = clubCoaches.map((c: { id: string }) => c.id);

    // Get all announcements from club coaches
    const now = new Date().toISOString();
    const { data: announcements, error: annError } = await (db as any)
      .from('announcements')
      .select(`
        *,
        announcement_reads!left(user_id, read_at)
      `)
      .in('coach_id', coachIds)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (annError) {
      throw annError;
    }

    if (!announcements) {
      return [];
    }

    // Transform to include read status and urgent flag
    return announcements.map((ann: any) => ({
      id: ann.id,
      clubId: ann.club_id,
      authorId: ann.coach_id,
      authorRole: 'coach' as const,
      title: ann.title,
      content: ann.message,
      priority: ann.priority,
      publishedAt: ann.created_at,
      expiresAt: ann.expires_at,
      createdAt: ann.created_at,
      updatedAt: ann.updated_at,
      isRead: ann.announcement_reads?.some((read: any) => read.user_id === userId) || false,
      isUrgent: ann.priority === 'urgent' || ann.priority === 'high',
    }));
  } catch (error) {
    console.error('[AnnouncementIntegration] Error in getAnnouncementsWithReadStatus:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get announcements with read status',
      { userId, clubId }
    );
  }
}

/**
 * Checks if an announcement is urgent (high or urgent priority).
 * Used for displaying visual indicators.
 * 
 * @param priority - The announcement priority
 * @returns true if the announcement is urgent
 * 
 * **Validates: Requirements 1.3** - Urgent announcement indicator
 */
export function isUrgentAnnouncement(priority: string): boolean {
  return priority === 'urgent' || priority === 'high';
}

/**
 * Gets the visual style for an announcement based on its priority.
 * 
 * @param priority - The announcement priority
 * @param isRead - Whether the announcement has been read
 * @returns CSS class string for styling
 */
export function getAnnouncementStyle(priority: string, isRead: boolean): string {
  if (priority === 'urgent') {
    return 'bg-red-50 border-red-300';
  }
  if (priority === 'high') {
    return 'bg-orange-50 border-orange-300';
  }
  return isRead ? 'border-gray-200' : 'border-black';
}

/**
 * Gets the badge style for an announcement priority.
 * 
 * @param priority - The announcement priority
 * @returns Object with label and CSS classes
 */
export function getPriorityBadge(priority: string): { label: string; className: string } | null {
  switch (priority) {
    case 'urgent':
      return {
        label: 'Urgent',
        className: 'text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full',
      };
    case 'high':
      return {
        label: 'Important',
        className: 'text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full',
      };
    default:
      return null;
  }
}

// Export the implementation object for type checking
export const announcementIntegration: AnnouncementIntegration = {
  onAnnouncementCreated,
  onAnnouncementRead,
  getUnreadCount,
};
