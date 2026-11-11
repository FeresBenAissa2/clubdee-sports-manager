'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface AttendanceLog {
  id: string;
  session_date: string;
  status: string;
  training_sessions?: {
    session_name: string;
  };
}

interface PerformanceRecord {
  id: string;
  test_date: string;
  test_type: string;
  result_value: number;
  result_unit: string;
}

interface RecentActivityProps {
  recentAttendance: AttendanceLog[] | null;
  recentPerformance: PerformanceRecord[] | null;
}

export default function RecentActivity({
  recentAttendance,
  recentPerformance,
}: RecentActivityProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Recent Attendance */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent attendance
          </h2>
          <Link
            href="/dashboard/athlete/attendance"
            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            View all
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {recentAttendance && recentAttendance.length > 0 ? (
          <div className="space-y-3">
            {recentAttendance.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      log.status === 'present'
                        ? 'bg-green-500'
                        : log.status === 'absent'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {log.training_sessions?.session_name || 'Training session'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(log.session_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium ${
                    log.status === 'present'
                      ? 'text-green-600'
                      : log.status === 'absent'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}
                >
                  {log.status === 'present'
                    ? 'Present'
                    : log.status === 'absent'
                    ? 'Absent'
                    : 'Leave'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500 py-8">
            No attendance history yet
          </p>
        )}
      </div>

      {/* Recent Performance */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent test results
          </h2>
          <Link
            href="/dashboard/athlete/performance"
            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            View all
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {recentPerformance && recentPerformance.length > 0 ? (
          <div className="space-y-3">
            {recentPerformance.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {record.test_type}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(record.test_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">
                    {record.result_value}
                  </p>
                  <p className="text-xs text-gray-500">{record.result_unit}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500 py-8">
            No test results yet
          </p>
        )}
      </div>
    </div>
  );
}
