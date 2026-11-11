'use client';

import { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { ScheduleViewToggle } from './ScheduleViewToggle';
import { ScheduleListView } from './ScheduleListView';
import { ScheduleCalendarView } from './ScheduleCalendarView';

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

interface Stats {
  totalSessions: number;
  attendedCount: number;
  attendanceRate: number;
}

interface SchedulePageClientProps {
  sessions: Session[];
  stats: Stats;
}

export function SchedulePageClient({ sessions, stats }: SchedulePageClientProps) {
  const [view, setView] = useState<'calendar' | 'list'>('list');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black mb-1">Training schedule</h1>
          <p className="text-sm text-gray-600">
            View the training schedule and check your attendance status
          </p>
        </div>
        <ScheduleViewToggle view={view} onViewChange={setView} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-black">{stats.totalSessions}</p>
          <p className="text-xs text-gray-500 mt-1">All</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-black">{stats.attendedCount}</p>
          <p className="text-xs text-gray-500 mt-1">Present</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-black">{stats.attendanceRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Attendance rate</p>
        </div>
      </div>

      {/* View Content */}
      {view === 'list' ? (
        <ScheduleListView sessions={sessions} />
      ) : (
        <ScheduleCalendarView sessions={sessions} />
      )}

      {/* Empty State */}
      {sessions.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-black mb-2">
            No training schedule yet
          </h3>
          <p className="text-sm text-gray-600">
            Your coach will create training sessions and they will appear here
          </p>
        </div>
      )}
    </div>
  );
}
