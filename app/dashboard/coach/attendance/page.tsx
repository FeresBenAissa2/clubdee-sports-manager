import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ChevronLeft, Calendar, Clock, MapPin, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function CoachAttendancePage() {
  const db = await createClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get coach profile
  // @ts-ignore - type inference issue
  const { data: coach } = await db
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    redirect('/dashboard/coach');
  }

  const coachData = coach as any;

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's sessions
  // @ts-ignore - type inference issue
  const { data: sessions, error: sessionsError } = await db
    .from('training_sessions')
    .select('*')
    .eq('coach_id', coachData.id)
    .eq('session_date', today)
    .order('start_time', { ascending: true });

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError);
  }

  // For each session, get attendance count
  const sessionsWithAttendance = await Promise.all(
    (sessions || []).map(async (session: any) => {
      const { count } = await db
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('training_session_id', session.id)
        .eq('status', 'present');

      return {
        ...session,
        attendance_count: count || 0,
      };
    })
  );

  // Format time helper
  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // HH:MM
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl p-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/coach"
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Record attendance
              </h1>
              <p className="text-sm text-gray-600">
                Check in and record training attendance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-6">
        {/* Today's Date */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Today's training schedule
          </h2>
          <p className="text-sm text-gray-600">{formatDate(today)}</p>
        </div>

        {/* Sessions List */}
        {sessionsWithAttendance.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No training sessions today
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                You have no training sessions scheduled for today
              </p>
              <div className="mt-6">
                <Link href="/dashboard/coach/sessions">
                  <Button>View full schedule</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessionsWithAttendance.map((session: any) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Time */}
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      {formatTime(session.start_time)} - {formatTime(session.end_time)}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{session.location}</span>
                  </div>

                  {/* Attendance Count */}
                  <div className="flex items-center text-sm text-gray-600">
                    <ClipboardCheck className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Checked in: {session.attendance_count} people</span>
                  </div>

                  {/* Description */}
                  {session.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {session.description}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3">
                    <Link
                      href={`/dashboard/coach/attendance/${session.id}`}
                      className="flex-1"
                    >
                      <Button className="w-full" size="sm">
                        Check in
                      </Button>
                    </Link>
                    <Link href={`/dashboard/coach/sessions/${session.id}`}>
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Link href="/dashboard/coach/sessions">
                <Button variant="outline" size="sm">
                  View full schedule
                </Button>
              </Link>
              <Link href="/dashboard/coach/sessions?tab=upcoming">
                <Button variant="outline" size="sm">
                  Upcoming schedule
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
