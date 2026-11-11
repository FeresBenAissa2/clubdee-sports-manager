'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Calendar, MessageSquare, TrendingUp, Check, X, Trash2 } from 'lucide-react';
import { Notification, markAsRead, markAllAsRead, deleteNotification } from '@/lib/notifications/actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface NotificationListProps {
  notifications: Notification[];
}

export function NotificationList({ notifications }: NotificationListProps) {
  const router = useRouter();
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_schedule':
      case 'schedule_reminder':
        return <Calendar className="w-5 h-5" />;
      case 'announcement':
        return <MessageSquare className="w-5 h-5" />;
      case 'test_result':
        return <TrendingUp className="w-5 h-5" />;
      case 'leave_approved':
        return <Check className="w-5 h-5" />;
      case 'leave_rejected':
        return <X className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getColor = (type: Notification['type']) => {
    switch (type) {
      case 'new_schedule':
        return 'bg-blue-100 text-blue-600';
      case 'schedule_reminder':
        return 'bg-yellow-100 text-yellow-600';
      case 'announcement':
        return 'bg-purple-100 text-purple-600';
      case 'test_result':
        return 'bg-green-100 text-green-600';
      case 'leave_approved':
        return 'bg-green-100 text-green-600';
      case 'leave_rejected':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    router.refresh();
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    await markAllAsRead();
    router.refresh();
    setIsMarkingAll(false);
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
    router.refresh();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Bell className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
        <p className="text-gray-600">You will be notified when there is new information</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600">You have {unreadCount} Unread notifications</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
          >
            {isMarkingAll ? 'Marking...' : 'Mark all as read'}
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`relative rounded-xl border-2 transition-all ${
              notification.read
                ? 'bg-white border-gray-200'
                : 'bg-blue-50 border-blue-300'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(notification.type)}`}>
                  {getIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5"></div>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      {notification.link && (
                        <Link
                          href={notification.link}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                          onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                        >
                          View details →
                        </Link>
                      )}
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs font-medium text-gray-600 hover:text-gray-700"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
