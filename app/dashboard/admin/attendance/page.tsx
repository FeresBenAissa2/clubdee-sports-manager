import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { getAttendanceStats, getClubStats } from '@/lib/admin/attendance-actions';
import { AttendanceOverview } from '@/components/admin/AttendanceOverview';
import { ClubStatsTable } from '@/components/admin/ClubStatsTable';
import { Calendar, TrendingUp } from 'lucide-react';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function AdminAttendancePage({ searchParams }: PageProps) {
  const db = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Verify user is admin
  const { data: userRole, error: roleError } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  // @ts-ignore - type inference issue
  if (roleError || !userRole || userRole.role !== 'admin') {
    redirect('/dashboard');
  }

  // Get date range from search params
  const { startDate, endDate } = await searchParams;

  // Fetch attendance statistics
  const { data: stats, error: statsError } = await getAttendanceStats({
    startDate,
    endDate,
  });

  // Fetch club statistics
  const { data: clubStats, error: clubStatsError } = await getClubStats({
    startDate,
    endDate,
  });

  // Handle errors
  if (statsError || clubStatsError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 shadow-lg">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-2xl font-bold">Training overview</h1>
          </div>
        </div>
        <div className="mx-auto max-w-7xl p-6">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-red-800">
              An error occurred while loading data: {statsError || clubStatsError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default empty stats if no data
  const defaultStats = {
    totalSessions: 0,
    totalAttendanceRecords: 0,
    averageAttendanceRate: 0,
    activeAthletes: 0,
    presentCount: 0,
    absentCount: 0,
    excusedCount: 0,
    lateCount: 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 shadow-lg">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-white/20 p-3">
                <TrendingUp className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Training overview</h1>
                <p className="text-indigo-100 text-sm mt-1">
                  System-wide training attendance statistics and reports
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filter by time range</h2>
          </div>
          <DateRangeFilter currentStartDate={startDate} currentEndDate={endDate} />
        </div>

        {/* System-wide Statistics */}
        <AttendanceOverview stats={stats || defaultStats} />

        {/* Club Statistics */}
        <ClubStatsTable clubStats={clubStats || []} />
      </div>
    </div>
  );
}
