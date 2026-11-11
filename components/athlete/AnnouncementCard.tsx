'use client';

import { useState } from 'react';
import { Bell, Pin, Check } from 'lucide-react';
import { markAnnouncementAsRead } from '@/lib/coach/announcement-actions';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  created_at: string;
  is_read?: boolean;
}

interface AnnouncementCardProps {
  announcement: Announcement;
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const [isRead, setIsRead] = useState(announcement.is_read || false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMarkAsRead = async () => {
    if (!isRead) {
      const result = await markAnnouncementAsRead(announcement.id);
      if (result.success) {
        setIsRead(true);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgent';
      case 'high':
        return 'Important';
      case 'normal':
        return 'Normal';
      case 'low':
        return 'Low';
      default:
        return priority;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
        isRead ? 'border-gray-100' : 'border-black'
      }`}
      onClick={() => {
        setIsExpanded(!isExpanded);
        handleMarkAsRead();
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {announcement.is_pinned && (
              <Pin className="h-4 w-4 text-black" />
            )}
            {!isRead && (
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
            )}
            <h3 className="font-bold text-black line-clamp-1">
              {announcement.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getPriorityColor(
                announcement.priority
              )}`}
            >
              {getPriorityLabel(announcement.priority)}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(announcement.created_at)}
            </span>
          </div>
        </div>

        {isRead && (
          <div className="ml-2">
            <Check className="h-5 w-5 text-green-600" />
          </div>
        )}
      </div>

      {/* Message */}
      <p
        className={`text-sm text-gray-700 whitespace-pre-wrap ${
          isExpanded ? '' : 'line-clamp-2'
        }`}
      >
        {announcement.message}
      </p>

      {/* Expand indicator */}
      {!isExpanded && announcement.message.length > 100 && (
        <p className="text-xs text-blue-600 mt-2">Tap to read more</p>
      )}
    </div>
  );
}
