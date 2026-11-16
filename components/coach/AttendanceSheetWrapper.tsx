'use client';

import { useCallback } from 'react';
import { AttendanceSheet } from './AttendanceSheet';
import { Users } from 'lucide-react';
import { Database } from '@/types/database.types';
import { useRouter } from 'next/navigation';

type AttendanceLog = Database['public']['Tables']['attendance']['Row'];

interface AthleteWithAttendance {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  attendance?: AttendanceLog;
}

interface AttendanceSheetWrapperProps {
  sessionId: string;
  initialAthletes: AthleteWithAttendance[];
  initialSession: any;
}

export function AttendanceSheetWrapper({
  sessionId,
  initialAthletes,
  initialSession,
}: AttendanceSheetWrapperProps) {
  const router = useRouter();
  // Read straight from props: router.refresh() delivers the new attendance, and a
  // useState copy would keep showing the old status until a full reload.
  const athletes = initialAthletes;

  // Handle refresh after attendance update
  const handleUpdate = useCallback(() => {
    // Refresh the page data
    router.refresh();
  }, [router]);

  // Calculate attendance summary
  const presentCount = athletes.filter((a) => a.attendance?.status === 'present').length;
  const absentCount = athletes.filter((a) => a.attendance?.status === 'absent').length;
  const excusedCount = athletes.filter((a) => a.attendance?.status === 'excused').length;
  const lateCount = athletes.filter((a) => a.attendance?.status === 'late').length;
  const unmarkedCount = athletes.filter((a) => !a.attendance).length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Content - Attendance Sheet */}
      <div className="lg:col-span-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Athlete roster</h2>
          <AttendanceSheet
            sessionId={sessionId}
            athletes={athletes}
            onUpdate={handleUpdate}
          />
        </div>
      </div>

      {/* Sidebar - Session Info & Summary */}
      <div className="space-y-6">
        {/* Session Information */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Session details</h2>
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {initialSession.session_name || 'Training'}
              </h3>
              {initialSession.session_type && (
                <p className="text-xs text-gray-600 mt-1">
                  Type: {initialSession.session_type}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 text-sm">
              <Users className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900">
                  {initialSession.session_date
                    ? new Date(initialSession.session_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Date not specified'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <Users className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900">
                  {initialSession.start_time || 'Not specified'} - {initialSession.end_time || 'Not specified'}
                </p>
              </div>
            </div>

            {initialSession.location && (
              <div className="flex items-start gap-2 text-sm">
                <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-900">{initialSession.location}</p>
                </div>
              </div>
            )}

            {initialSession.description && (
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-600">{initialSession.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Attendance summary</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">All</span>
              </div>
              <span className="text-sm font-medium">{athletes.length} {athletes.length === 1 ? 'athlete' : 'athletes'}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">Present</span>
              </div>
              <span className="text-sm font-medium text-green-600">{presentCount} {presentCount === 1 ? 'athlete' : 'athletes'}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-sm text-gray-600">Late</span>
              </div>
              <span className="text-sm font-medium text-yellow-600">{lateCount} {lateCount === 1 ? 'athlete' : 'athletes'}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600">Excused</span>
              </div>
              <span className="text-sm font-medium text-blue-600">{excusedCount} {excusedCount === 1 ? 'athlete' : 'athletes'}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">Absent</span>
              </div>
              <span className="text-sm font-medium text-red-600">{absentCount} {absentCount === 1 ? 'athlete' : 'athletes'}</span>
            </div>

            {unmarkedCount > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                  <span className="text-sm text-gray-600">Not marked yet</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{unmarkedCount} {unmarkedCount === 1 ? 'athlete' : 'athletes'}</span>
              </div>
            )}

            {/* Attendance Rate */}
            {athletes.length > 0 && (
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Attendance rate</span>
                  <span className="text-sm font-medium">
                    {Math.round(((presentCount + lateCount) / athletes.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${((presentCount + lateCount) / athletes.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Tips</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Select status from the menu to the right of each athlete</li>
            <li>• Each change is saved automatically</li>
            <li>• You can add a note for any athlete</li>
            <li>• Use the search box to find an athlete quickly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
