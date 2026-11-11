import { notFound, redirect } from 'next/navigation';
import { getSessionDetails } from '@/lib/coach/session-actions';
import { getSessionAttendance } from '@/lib/coach/attendance-actions';
import { Calendar, Clock, MapPin, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface SessionDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SessionDetailsPage({
  params,
}: SessionDetailsPageProps) {
  const { id } = await params;

  // Fetch session details
  const sessionResult = await getSessionDetails(id);

  if (sessionResult.error || !sessionResult.data) {
    if (sessionResult.error === 'Training session not found') {
      notFound();
    }
    if (sessionResult.error === 'Unauthorized: please sign in') {
      redirect('/login');
    }
    return (
      <div className="p-6">
        <div className="text-red-600">An error occurred: {sessionResult.error}</div>
      </div>
    );
  }

  const session = sessionResult.data;

  // Fetch attendance data
  const attendanceResult = await getSessionAttendance(id);
  const athletes = attendanceResult.data || [];

  // Calculate attendance summary
  const attendanceSummary = {
    total: athletes.length,
    present: athletes.filter((a) => a.attendance?.status === 'present').length,
    absent: athletes.filter((a) => a.attendance?.status === 'absent').length,
    excused: athletes.filter((a) => a.attendance?.status === 'excused').length,
    late: athletes.filter((a) => a.attendance?.status === 'late').length,
    notMarked: athletes.filter((a) => !a.attendance).length,
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format time
  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // HH:MM
  };

  // Determine status
  const getStatus = () => {
    const sessionDate = new Date(session.session_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate < today) {
      return 'completed';
    } else if (sessionDate.getTime() === today.getTime()) {
      return 'ongoing';
    } else {
      return 'scheduled';
    }
  };

  const status = getStatus();

  // Status badge styling
  const statusConfig = {
    scheduled: {
      label: 'Schedule',
      className: 'bg-blue-100 text-blue-700',
    },
    ongoing: {
      label: 'Today',
      className: 'bg-green-100 text-green-700',
    },
    completed: {
      label: 'Completed',
      className: 'bg-gray-100 text-gray-700',
    },
  };

  const currentStatus = statusConfig[status];

  // Check if session can be edited/cancelled (only scheduled sessions)
  const canEdit = status === 'scheduled';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/coach/sessions"
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            ← Back to training schedule
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Training session details
          </h1>
        </div>
        <div>
          <span
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${currentStatus.className}`}
          >
            {currentStatus.label}
          </span>
        </div>
      </div>

      {/* Session Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{session.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date */}
          <div className="flex items-start">
            <Calendar className="h-5 w-5 mr-3 mt-0.5 text-gray-500 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-500">Date</div>
              <div className="text-base text-gray-900">
                {formatDate(session.session_date)}
              </div>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-start">
            <Clock className="h-5 w-5 mr-3 mt-0.5 text-gray-500 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-500">Time</div>
              <div className="text-base text-gray-900">
                {formatTime(session.start_time)} - {formatTime(session.end_time)}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start">
            <MapPin className="h-5 w-5 mr-3 mt-0.5 text-gray-500 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-500">Location</div>
              <div className="text-base text-gray-900">{session.location}</div>
            </div>
          </div>

          {/* Description */}
          {session.description && (
            <div className="flex items-start">
              <FileText className="h-5 w-5 mr-3 mt-0.5 text-gray-500 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-gray-500">
                  Details
                </div>
                <div className="text-base text-gray-900 whitespace-pre-wrap">
                  {session.description}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Attendance summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {attendanceSummary.total}
              </div>
              <div className="text-sm text-gray-600">All athletes</div>
            </div>

            {/* Present */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">
                {attendanceSummary.present}
              </div>
              <div className="text-sm text-green-600">Present</div>
            </div>

            {/* Absent */}
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">
                {attendanceSummary.absent}
              </div>
              <div className="text-sm text-red-600">Absent</div>
            </div>

            {/* Excused */}
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">
                {attendanceSummary.excused}
              </div>
              <div className="text-sm text-yellow-600">Excused</div>
            </div>

            {/* Late */}
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">
                {attendanceSummary.late}
              </div>
              <div className="text-sm text-orange-600">Late</div>
            </div>

            {/* Not Marked */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">
                {attendanceSummary.notMarked}
              </div>
              <div className="text-sm text-gray-600">Not checked in</div>
            </div>
          </div>

          {/* Attendance Rate */}
          {attendanceSummary.total > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Attendance rate
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {Math.round(
                    (attendanceSummary.present / attendanceSummary.total) * 100
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      (attendanceSummary.present / attendanceSummary.total) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Link href={`/dashboard/coach/attendance/${id}`} className="flex-1">
          <Button className="w-full" size="lg">
            Check in athletes
          </Button>
        </Link>
        {canEdit && (
          <>
            <Link href={`/dashboard/coach/sessions/${id}/edit`}>
              <Button variant="outline" size="lg">
                Edit
              </Button>
            </Link>
            <Link href={`/dashboard/coach/sessions/${id}/cancel`}>
              <Button variant="destructive" size="lg">
                Cancel
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
