import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/db/server';
import { getMyAttendance, getAttendanceStats } from '@/lib/athlete/attendance-actions';
import AttendanceStats from '@/components/athlete/AttendanceStats';
import AttendanceHistory from '@/components/athlete/AttendanceHistory';

export default async function AttendanceHistoryPage() {
  const db = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get athlete profile to verify role
  const { data: profile } = await db
    .from('athletes')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  // Fetch attendance data using server actions
  const { data: attendanceRecords, error: attendanceError } = await getMyAttendance();
  const { data: stats, error: statsError } = await getAttendanceStats();

  // Handle errors
  if (attendanceError || statsError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl p-6">
          <div className="rounded-lg bg-red-50 p-4 text-red-700">
            An error occurred while loading data: {attendanceError || statsError}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl p-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/athlete"
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Attendance history
              </h1>
              <p className="text-sm text-gray-600">
                View your training attendance history and statistics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-6">
        <div className="space-y-6">
          {/* Attendance Statistics */}
          {stats && (
            <AttendanceStats
              totalSessions={stats.totalSessions}
              presentCount={stats.presentCount}
              absentCount={stats.absentCount}
              excusedCount={stats.excusedCount}
              lateCount={stats.lateCount}
              attendanceRate={stats.attendanceRate}
            />
          )}

          {/* Attendance History */}
          <AttendanceHistory records={(attendanceRecords || []) as any} />
        </div>
      </div>
    </div>
  );
}
