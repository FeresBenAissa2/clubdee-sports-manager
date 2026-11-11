import { redirect } from 'next/navigation';
import { createClient } from '@/lib/db/server';
import { getSessionDetails } from '@/lib/athlete/attendance-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckInButton } from '@/components/athlete/CheckInButton';
import { LeaveRequestForm } from '@/components/athlete/LeaveRequestForm';
import { Calendar, Clock, MapPin, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const db = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get session details
  const { data: session, error } = await getSessionDetails(id);

  if (error || !session) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error || 'Training session not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get coach name
  let coachName = 'Not specified';
  if (session.coach_id) {
    const { data: coach } = await db
      .from('coaches')
      .select('first_name, last_name')
      .eq('id', session.coach_id)
      .maybeSingle();
    
    if (coach) {
      // @ts-ignore - type inference issue with select
      coachName = `${coach.first_name} ${coach.last_name}`;
    }
  }

  // Format date and time
  const sessionDate = new Date(session.session_date);
  const formattedDate = sessionDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Determine check-in eligibility
  const hasCheckedIn = !!session.attendance;
  const hasLeaveRequest = !!session.leave_request;
  const isCancelled = session.status === 'cancelled';

  // Get status display
  const getStatusDisplay = () => {
    if (isCancelled) {
      return {
        icon: XCircle,
        text: 'Cancelled',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    }

    if (hasCheckedIn) {
      const status = session.attendance?.status;
      if (status === 'present') {
        return {
          icon: CheckCircle,
          text: 'Registered',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      } else if (status === 'late') {
        return {
          icon: AlertCircle,
          text: 'Present (late)',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      }
    }

    if (hasLeaveRequest) {
      const status = session.leave_request?.status;
      if (status === 'pending') {
        return {
          icon: Clock,
          text: 'Leave pending approval',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
      } else if (status === 'approved') {
        return {
          icon: CheckCircle,
          text: 'Leave approved',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      } else if (status === 'rejected') {
        return {
          icon: XCircle,
          text: 'Leave request rejected',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      }
    }

    return {
      icon: Clock,
      text: 'Not checked in yet',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    };
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  // Determine if check-in button should be shown
  const canCheckIn = !hasCheckedIn && !hasLeaveRequest && !isCancelled;

  // Determine if leave request form should be shown
  const canRequestLeave = !hasCheckedIn && !hasLeaveRequest && !isCancelled;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {session.title || 'Training schedule'}
        </h1>
        <p className="text-gray-600">Training session details</p>
      </div>

      {/* Status Card */}
      <Card className={`mb-6 ${statusDisplay.borderColor} border-2`}>
        <CardContent className={`pt-6 ${statusDisplay.bgColor}`}>
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-6 w-6 ${statusDisplay.color}`} />
            <div>
              <div className={`font-semibold ${statusDisplay.color}`}>
                {statusDisplay.text}
              </div>
              {hasCheckedIn && session.attendance?.check_in_time && (
                <div className="text-sm text-gray-600 mt-1">
                  Checked in at:{' '}
                  {new Date(session.attendance.check_in_time).toLocaleString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
              {hasLeaveRequest && session.leave_request?.reason && (
                <div className="text-sm text-gray-600 mt-1">
                  Reason: {session.leave_request.reason}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Training session details</CardTitle>
          <CardDescription>About this training session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Date</div>
              <div className="text-gray-600">{formattedDate}</div>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Time</div>
              <div className="text-gray-600">
                {session.start_time} - {session.end_time}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Location</div>
              <div className="text-gray-600">{session.location || 'Not specified'}</div>
            </div>
          </div>

          {/* Coach */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Coach</div>
              <div className="text-gray-600">{coachName}</div>
            </div>
          </div>



          {/* Description */}
          {session.description && (
            <div className="pt-4 border-t">
              <div className="font-medium text-gray-900 mb-2">Additional details</div>
              <div className="text-gray-600 whitespace-pre-wrap">{session.description}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Section */}
      {canCheckIn && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Check in attendance</CardTitle>
            <CardDescription>
              You can check in from 30 minutes before start until 15 minutes after start.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CheckInButton
              sessionId={session.id}
              sessionDate={session.session_date}
              startTime={session.start_time}
              sessionTitle={session.title || undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Leave Request Section */}
      {canRequestLeave && (
        <Card>
          <CardHeader>
            <CardTitle>Request leave</CardTitle>
            <CardDescription>
              If you cannot attend, please request leave at least 2 hours in advance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveRequestForm
              sessionId={session.id}
              sessionTitle={session.title || undefined}
              sessionDate={session.session_date}
              startTime={session.start_time}
            />
          </CardContent>
        </Card>
      )}

      {/* Cancelled Notice */}
      {isCancelled && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-900 mb-1">
                  This training session was cancelled
                </div>
                <div className="text-sm text-red-700">
                  Your coach cancelled this session. Contact your coach for more information.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
