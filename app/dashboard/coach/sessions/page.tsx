import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getCoachSessions } from '@/lib/coach/session-actions';
import { SessionList } from '@/components/coach/SessionList';
import { CreateSessionDialog } from '@/components/coach/CreateSessionDialog';

export default async function CoachSessionsPage() {
  const db = await createClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get coach profile
  const { data: coach } = await db
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    redirect('/dashboard/coach');
  }

  // Fetch all sessions for stats and list
  const { data: sessions, error: sessionsError } = await getCoachSessions();

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const stats = {
    total: sessions?.length || 0,
    upcoming: sessions?.filter(s => new Date(s.session_date) >= today).length || 0,
    past: sessions?.filter(s => new Date(s.session_date) < today).length || 0,
    thisWeek: sessions?.filter(s => {
      const sessionDate = new Date(s.session_date);
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return sessionDate >= today && sessionDate <= weekFromNow;
    }).length || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/coach"
                className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  Training schedule
                </h1>
                <p className="text-xs md:text-sm text-gray-600">
                  Create and manage training schedules
                </p>
              </div>
            </div>
            
            {/* Create Session Button */}
            <CreateSessionDialog />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">All</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Upcoming</p>
            <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">This week</p>
            <p className="text-2xl font-bold text-green-600">{stats.thisWeek}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Past</p>
            <p className="text-2xl font-bold text-gray-500">{stats.past}</p>
          </div>
        </div>

        {/* Session List */}
        {sessionsError ? (
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-600">{sessionsError}</p>
          </div>
        ) : (
          <SessionList sessions={sessions || []} />
        )}
      </div>
    </div>
  );
}
