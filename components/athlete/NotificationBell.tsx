'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { getUnreadCount } from '@/lib/notifications/actions';

/**
 * Notification Bell Component
 * Shows unread notification count badge
 */
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load initial count
    loadUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    const result = await getUnreadCount();
    if (!result.error && result.count !== undefined) {
      setUnreadCount(result.count);
    }
  };

  return (
    <Link
      href="/dashboard/athlete/notifications"
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
    >
      <Bell className="w-5 h-5 text-gray-700" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
