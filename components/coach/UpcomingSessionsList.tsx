'use client';

import { UpcomingSession } from '@/lib/coach/dashboard-actions';
import { Calendar, Clock, MapPin, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface UpcomingSessionsListProps {
  sessions: UpcomingSession[];
}

export function UpcomingSessionsList({ sessions }: UpcomingSessionsListProps) {
  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No upcoming training</p>
        <Link
          href="/dashboard/coach/sessions"
          className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Create new training
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const attendanceRate = session.total_athletes > 0
          ? Math.round((session.attendance_count / session.total_athletes) * 100)
          : 0;

        return (
          <Link
            key={session.id}
            href={`/dashboard/coach/sessions/${session.id}`}
            className="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-black mb-1">{session.title}</h4>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(session.session_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>

            {session.location && (
              <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
                <MapPin className="h-3.5 w-3.5" />
                <span>{session.location}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {session.attendance_count}/{session.total_athletes} people
                </span>
              </div>
              {session.attendance_count > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{attendanceRate}%</span>
                </div>
              )}
            </div>
          </Link>
        );
      })}

      <Link
        href="/dashboard/coach/sessions"
        className="block text-center py-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        View all →
      </Link>
    </div>
  );
}
