'use client';

import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceStatsSkeleton } from '@/components/ui/loading-skeletons';

interface AttendanceStatsProps {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  attendanceRate: number;
  isLoading?: boolean;
}

export default function AttendanceStats({
  totalSessions,
  presentCount,
  absentCount,
  excusedCount,
  lateCount,
  attendanceRate,
  isLoading = false,
}: AttendanceStatsProps) {
  // Show loading skeleton
  if (isLoading) {
    return <AttendanceStatsSkeleton />;
  }

  // Calculate percentage for progress bar
  const progressPercentage = Math.min(100, Math.max(0, attendanceRate));

  // Determine color based on attendance rate
  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session attendance statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Attendance Rate */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Attendance rate
            </span>
            <span className={`text-2xl font-bold ${getTextColor(attendanceRate)}`}>
              {attendanceRate}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor(attendanceRate)}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <p className="mt-2 text-xs text-gray-500">
            FromAll {totalSessions} sessions
          </p>
        </div>

        {/* Status Counts */}
        <div className="grid grid-cols-2 gap-4">
          {/* Present */}
          <div className="flex items-center space-x-3 rounded-lg bg-green-50 p-3">
            <div className="rounded-full bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Present</p>
              <p className="text-lg font-bold text-green-600">{presentCount}</p>
            </div>
          </div>

          {/* Late */}
          <div className="flex items-center space-x-3 rounded-lg bg-yellow-50 p-3">
            <div className="rounded-full bg-yellow-100 p-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Late</p>
              <p className="text-lg font-bold text-yellow-600">{lateCount}</p>
            </div>
          </div>

          {/* Excused */}
          <div className="flex items-center space-x-3 rounded-lg bg-blue-50 p-3">
            <div className="rounded-full bg-blue-100 p-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Leave</p>
              <p className="text-lg font-bold text-blue-600">{excusedCount}</p>
            </div>
          </div>

          {/* Absent */}
          <div className="flex items-center space-x-3 rounded-lg bg-red-50 p-3">
            <div className="rounded-full bg-red-100 p-2">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Absent</p>
              <p className="text-lg font-bold text-red-600">{absentCount}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
