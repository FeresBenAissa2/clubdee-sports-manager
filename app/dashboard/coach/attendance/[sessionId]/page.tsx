import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getSessionAttendance } from '@/lib/coach/attendance-actions';
import { AttendanceSheetWrapper } from '@/components/coach/AttendanceSheetWrapper';

interface PageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function CoachAttendanceMarkingPage({ params }: PageProps) {
  const { sessionId } = await params;
  const db = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get coach profile
  const { data: coach } = await db
    .from('profiles')
    .select('id, club_id')
    .eq('id', user.id)
    .eq('role', 'coach')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    redirect('/dashboard/coach');
  }

  // Fetch session and athletes
  const { data: athletes, session, error } = await getSessionAttendance(sessionId);

  if (error || !session || !athletes) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="mx-auto max-w-7xl p-6">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/coach/attendance"
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Check in</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl p-6">
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-red-600">{error || 'Training session not found'}</p>
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
              href="/dashboard/coach/sessions"
              className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Check in</h1>
              <p className="text-sm text-gray-600">
                Record training attendance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-6">
        <AttendanceSheetWrapper
          sessionId={sessionId}
          initialAthletes={athletes}
          initialSession={session}
        />
      </div>
    </div>
  );
}
