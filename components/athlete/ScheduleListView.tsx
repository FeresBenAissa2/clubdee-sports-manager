'use client';

import { Clock, MapPin, User, ChevronRight, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Session {
  id: string;
  title?: string;
  session_name?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location?: string;
  description?: string;
  coach_name?: string;
  attendance_status?: string;
  is_today?: boolean;
  is_past?: boolean;
}

interface ScheduleListViewProps {
  sessions: Session[];
}

export function ScheduleListView({ sessions }: ScheduleListViewProps) {
  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const dateKey = session.session_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  // Sort dates
  const sortedDates = Object.keys(sessionsByDate).sort();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    return date.toDateString() === today.toDateString();
  };

  const isPast = (dateString: string) => {
    const date = new Date(dateString);
    return date < today;
  };

  const getStatusBadge = (session: Session) => {
    if (session.attendance_status === 'present') {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          <CheckCircle className="w-3 h-3" />
          Present
        </div>
      );
    }
    if (session.attendance_status === 'absent') {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
          <XCircle className="w-3 h-3" />
          Absent
        </div>
      );
    }
    if (session.attendance_status === 'late') {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
          <AlertCircle className="w-3 h-3" />
          Late
        </div>
      );
    }
    if (session.is_today) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-black text-white text-xs font-medium rounded-full">
          <AlertCircle className="w-3 h-3" />
          Today
        </div>
      );
    }
    return null;
  };

  if (sortedDates.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-black mb-2">No training sessions</h3>
        <p className="text-sm text-gray-600">No sessions scheduled yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map((dateKey) => {
        const daySessions = sessionsByDate[dateKey];
        const dayIsToday = isToday(dateKey);
        const dayIsPast = isPast(dateKey);

        return (
          <div key={dateKey} className={dayIsPast ? 'opacity-60' : ''}>
            {/* Date Header */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  dayIsToday
                    ? 'bg-black text-white'
                    : dayIsPast
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {dayIsToday ? 'Today' : formatShortDate(dateKey)}
              </div>
              <span className="text-xs text-gray-500">{formatDate(dateKey)}</span>
            </div>

            {/* Sessions List */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {daySessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/dashboard/athlete/schedule/${session.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group"
                >
                  {/* Time */}
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className="text-sm font-bold text-black">
                      {session.start_time?.slice(0, 5)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {session.end_time?.slice(0, 5)}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-12 bg-gray-200"></div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-black group-hover:underline truncate">
                        {session.title || session.session_name || 'Training session'}
                      </h3>
                      {getStatusBadge(session)}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                      {session.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{session.location}</span>
                        </div>
                      )}
                      {session.coach_name && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Coach {session.coach_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
