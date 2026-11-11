/**
 * Announcement Style Utilities
 * 
 * Pure utility functions for announcement styling.
 * These can be used in both server and client components.
 */

/**
 * AnnouncementCardStyle Helper
 * 
 * Returns the appropriate CSS classes for an announcement card
 * based on its priority and read status.
 * 
 * **Validates: Requirements 1.3** - Urgent announcement indicator
 */
export function getAnnouncementCardStyle(
  priority: 'low' | 'normal' | 'high' | 'urgent',
  isRead: boolean
): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-50 border-red-300';
    case 'high':
      return 'bg-orange-50 border-orange-300';
    default:
      return isRead ? 'border-gray-200' : 'border-black';
  }
}

/**
 * AnnouncementIconStyle Helper
 * 
 * Returns the appropriate CSS classes for an announcement icon
 * based on its priority.
 */
export function getAnnouncementIconStyle(
  priority: 'low' | 'normal' | 'high' | 'urgent'
): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-600';
    case 'high':
      return 'bg-orange-600';
    default:
      return 'bg-black';
  }
}
