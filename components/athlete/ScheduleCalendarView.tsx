'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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

interface ScheduleCalendarViewProps {
  sessions: Session[];
}

export function ScheduleCalendarView({ sessions }: ScheduleCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const dateKey = session.session_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate calendar days
  const calendarDays = [];
  
  // Empty cells for days before the first day of month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const getDateKey = (day: number) => {
    const d = new Date(year, month, day);
    return d.toISOString().split('T')[0];
  };

  const isToday = (day: number) => {
    const d = new Date(year, month, day);
    return d.toDateString() === today.toDateString();
  };

  const isPast = (day: number) => {
    const d = new Date(year, month, day);
    return d < today;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-black">
            {monthNames[month]} {year + 543}
          </h2>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Today
          </button>
        </div>
        
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayNames.map((day, index) => (
          <div
            key={day}
            className={`py-2 text-center text-xs font-medium ${
              index === 0 ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="min-h-[80px] bg-gray-50" />;
          }

          const dateKey = getDateKey(day);
          const daySessions = sessionsByDate[dateKey] || [];
          const hasSession = daySessions.length > 0;
          const dayIsToday = isToday(day);
          const dayIsPast = isPast(day);
          const isSunday = index % 7 === 0;

          return (
            <div
              key={day}
              className={`min-h-[80px] border-b border-r border-gray-100 p-1 ${
                dayIsPast ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <div
                className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  dayIsToday
                    ? 'bg-black text-white'
                    : isSunday
                    ? 'text-red-500'
                    : dayIsPast
                    ? 'text-gray-400'
                    : 'text-gray-700'
                }`}
              >
                {day}
              </div>
              
              {/* Sessions for this day */}
              <div className="space-y-1">
                {daySessions.slice(0, 2).map((session) => (
                  <Link
                    key={session.id}
                    href={`/dashboard/athlete/schedule/${session.id}`}
                    className={`block text-xs p-1 rounded truncate ${
                      session.attendance_status === 'present'
                        ? 'bg-green-100 text-green-800'
                        : session.attendance_status === 'absent'
                        ? 'bg-red-100 text-red-800'
                        : dayIsToday
                        ? 'bg-black text-white'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {session.start_time?.slice(0, 5)} {session.title || session.session_name || 'Training'}
                  </Link>
                ))}
                {daySessions.length > 2 && (
                  <div className="text-xs text-gray-500 pl-1">
                    +{daySessions.length - 2} Other
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-gray-200 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100"></div>
          <span className="text-gray-600">Checked in</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-100"></div>
          <span className="text-gray-600">Absent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-100"></div>
          <span className="text-gray-600">Upcoming</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-black"></div>
          <span className="text-gray-600">Today</span>
        </div>
      </div>
    </div>
  );
}
