'use client';

import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Database } from '@/types/database.types';
import { useState } from 'react';
import { athleteCheckIn, requestLeave } from '@/lib/athlete/attendance-actions';
import { useRouter } from 'next/navigation';

type TrainingSession = Database['public']['Tables']['training_sessions']['Row'];
type AttendanceLog = Database['public']['Tables']['attendance']['Row'];

// Temporary type until database types are regenerated
type LeaveRequest = {
  id: string;
  session_id: string;
  athlete_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

interface SessionWithAttendance extends TrainingSession {
  attendance?: AttendanceLog | null;
  leave_request?: LeaveRequest | null;
  coach_name?: string;
}

interface ScheduleCardProps {
  session: SessionWithAttendance;
}

export function ScheduleCard({ session }: ScheduleCardProps) {
  const router = useRouter();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isRequestingLeave, setIsRequestingLeave] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  // Check if check-in is available
  const isCheckInAvailable = () => {
    if (session.attendance || session.leave_request) {
      return false;
    }

    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    
    // 30 minutes before
    const earliestCheckIn = new Date(sessionDateTime.getTime() - 30 * 60 * 1000);
    // 15 minutes after
    const latestCheckIn = new Date(sessionDateTime.getTime() + 15 * 60 * 1000);

    return now >= earliestCheckIn && now <= latestCheckIn;
  };

  // Check if leave request is available
  const isLeaveRequestAvailable = () => {
    if (session.attendance || session.leave_request) {
      return false;
    }

    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return sessionDateTime >= twoHoursFromNow;
  };

  // Get check-in status display
  const getStatusDisplay = () => {
    if (session.attendance) {
      const statusConfig = {
        present: {
          label: 'Present',
          icon: CheckCircle,
          className: 'text-green-600 bg-green-50',
        },
        late: {
          label: 'Late',
          icon: AlertCircle,
          className: 'text-yellow-600 bg-yellow-50',
        },
        absent: {
          label: 'Absent',
          icon: XCircle,
          className: 'text-red-600 bg-red-50',
        },
        excused: {
          label: 'Leave',
          icon: CheckCircle,
          className: 'text-blue-600 bg-blue-50',
        },
      };

      const config = statusConfig[session.attendance.status];
      const Icon = config.icon;

      return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.className}`}>
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">{config.label}</span>
          {session.attendance.check_in_time && (
            <span className="text-xs">
              ({new Date(session.attendance.check_in_time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })})
            </span>
          )}
        </div>
      );
    }

    if (session.leave_request) {
      const statusConfig = {
        pending: {
          label: 'Pending approval',
          className: 'text-yellow-600 bg-yellow-50',
        },
        approved: {
          label: 'Approve leave',
          className: 'text-green-600 bg-green-50',
        },
        rejected: {
          label: 'Leave not approved',
          className: 'text-red-600 bg-red-50',
        },
      };

      const config = statusConfig[session.leave_request.status];

      return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.className}`}>
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{config.label}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 bg-gray-50">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Not checked in yet</span>
      </div>
    );
  };

  // Handle check-in
  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    setError(null);

    const result = await athleteCheckIn(session.id);

    if (result.error) {
      setError(result.error);
      setIsCheckingIn(false);
    } else {
      // Success - refresh the page
      router.refresh();
    }
  };

  // Handle leave request submission
  const handleLeaveRequest = async () => {
    if (leaveReason.trim().length < 10) {
      setError('Please enter a reason of at least 10 characters.');
      return;
    }

    setIsRequestingLeave(true);
    setError(null);

    const result = await requestLeave({
      sessionId: session.id,
      reason: leaveReason,
    });

    if (result.error) {
      setError(result.error);
      setIsRequestingLeave(false);
    } else {
      // Success - refresh the page
      router.refresh();
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        {/* Session Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {session.title}
        </h3>

        {/* Session Info */}
        <div className="space-y-2 mb-4">
          {/* Date */}
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{formatDate(session.session_date)}</span>
          </div>

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

          {/* Coach */}
          {session.coach_name && (
            <div className="flex items-center text-sm text-gray-600">
              <User className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Coach: {session.coach_name}</span>
            </div>
          )}
        </div>

        {/* Description (if exists) */}
        {session.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Check-in Status */}
        <div className="mb-4">
          {getStatusDisplay()}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Leave Request Form */}
        {showLeaveForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for leave (At least 10 characters)
            </label>
            <textarea
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter your reason..."
              disabled={isRequestingLeave}
            />
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleLeaveRequest}
                disabled={isRequestingLeave}
                size="sm"
                className="flex-1"
              >
                {isRequestingLeave ? 'Sending...' : 'Submit request'}
              </Button>
              <Button
                onClick={() => {
                  setShowLeaveForm(false);
                  setLeaveReason('');
                  setError(null);
                }}
                disabled={isRequestingLeave}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Action Buttons */}
      <CardFooter className="flex gap-2 border-t pt-4">
        {isCheckInAvailable() && !showLeaveForm && (
          <Button
            onClick={handleCheckIn}
            disabled={isCheckingIn}
            className="flex-1"
          >
            {isCheckingIn ? 'Checking in...' : '✓ Check in'}
          </Button>
        )}

        {isLeaveRequestAvailable() && !showLeaveForm && (
          <Button
            onClick={() => setShowLeaveForm(true)}
            variant="outline"
            className="flex-1"
          >
            Request leave
          </Button>
        )}

        {!isCheckInAvailable() && !isLeaveRequestAvailable() && !showLeaveForm && (
          <Button
            variant="outline"
            className="flex-1"
            disabled
          >
            Action unavailable
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
