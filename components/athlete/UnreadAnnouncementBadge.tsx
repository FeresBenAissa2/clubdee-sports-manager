'use client';

import { useEffect, useState } from 'react';

interface UnreadAnnouncementBadgeProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * UnreadAnnouncementBadge Component
 * 
 * Displays a badge with the count of unread announcements.
 * Used in the athlete dashboard to show unread announcement counts.
 * 
 * **Validates: Requirements 1.4** - Unread badge count accuracy
 */
export function UnreadAnnouncementBadge({ 
  count, 
  size = 'md',
  className = '' 
}: UnreadAnnouncementBadgeProps) {
  if (count <= 0) {
    return null;
  }

  const sizeClasses = {
    sm: 'min-w-[16px] h-4 text-[10px] px-1',
    md: 'min-w-[20px] h-5 text-xs px-1.5',
    lg: 'min-w-[24px] h-6 text-sm px-2',
  };

  return (
    <span 
      className={`inline-flex items-center justify-center rounded-full bg-red-500 text-white font-bold ${sizeClasses[size]} ${className}`}
      aria-label={`${count} Unread announcements`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * UrgentIndicator Component
 * 
 * Displays a visual indicator for urgent announcements.
 * Shows a pulsing red dot for unread urgent announcements.
 * 
 * **Validates: Requirements 1.3** - Urgent announcement indicator
 */
export function UrgentIndicator({ 
  isUrgent, 
  isRead,
  className = '' 
}: { 
  isUrgent: boolean; 
  isRead: boolean;
  className?: string;
}) {
  if (!isUrgent || isRead) {
    return null;
  }

  return (
    <div 
      className={`w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0 ${className}`}
      aria-label="AnnouncementUrgent"
    />
  );
}

/**
 * AnnouncementPriorityBadge Component
 * 
 * Displays a badge indicating the priority level of an announcement.
 * 
 * **Validates: Requirements 1.3** - Urgent announcement indicator
 */
export function AnnouncementPriorityBadge({ 
  priority,
  className = '' 
}: { 
  priority: 'low' | 'normal' | 'high' | 'urgent';
  className?: string;
}) {
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          label: 'Urgent',
          className: 'text-red-600 bg-red-100',
        };
      case 'high':
        return {
          label: 'Important',
          className: 'text-orange-600 bg-orange-100',
        };
      case 'normal':
        return {
          label: 'Normal',
          className: 'text-blue-600 bg-blue-100',
        };
      case 'low':
        return {
          label: 'Low',
          className: 'text-gray-600 bg-gray-100',
        };
      default:
        return null;
    }
  };

  const config = getPriorityConfig(priority);
  
  if (!config || priority === 'normal' || priority === 'low') {
    return null;
  }

  return (
    <span 
      className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

// Re-export style utilities for backward compatibility with client components
// Note: For server components, import directly from '@/lib/utils/announcement-styles'
export { getAnnouncementCardStyle, getAnnouncementIconStyle } from '@/lib/utils/announcement-styles';
