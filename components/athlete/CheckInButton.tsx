'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { athleteCheckIn } from '@/lib/athlete/attendance-actions';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface CheckInButtonProps {
  sessionId: string;
  sessionDate: string;
  startTime: string;
  sessionTitle?: string;
  disabled?: boolean;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * CheckInButton Component
 * 
 * Validates check-in time window (30 min before - 15 min after)
 * Shows confirmation dialog
 * Calls athleteCheckIn action
 * Displays success/error toast notifications
 * Updates UI state after check-in
 * 
 * Requirements: AC2, BR1
 */
export function CheckInButton({
  sessionId,
  sessionDate,
  startTime,
  sessionTitle,
  disabled = false,
  className = '',
  onSuccess,
  onError,
}: CheckInButtonProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  /**
   * Validate check-in time window
   * BR1: 30 minutes before to 15 minutes after start time
   */
  const validateCheckInWindow = (): { valid: boolean; message?: string } => {
    const sessionDateTime = new Date(`${sessionDate}T${startTime}`);
    const now = new Date();

    // 30 minutes before
    const earliestCheckIn = new Date(sessionDateTime.getTime() - 30 * 60 * 1000);
    // 15 minutes after
    const latestCheckIn = new Date(sessionDateTime.getTime() + 15 * 60 * 1000);

    if (now < earliestCheckIn) {
      const minutesUntil = Math.ceil((earliestCheckIn.getTime() - now.getTime()) / (60 * 1000));
      return {
        valid: false,
        message: `Check-in is not open yet (You can check in in ${minutesUntil} min)`,
      };
    }

    if (now > latestCheckIn) {
      return {
        valid: false,
        message: 'Check-in window closed (You can check in until 15 minutes after start time)',
      };
    }

    return { valid: true };
  };

  /**
   * Get time status for display
   */
  const getTimeStatus = (): {
    status: 'early' | 'on-time' | 'late' | 'closed';
    message: string;
    icon: typeof Clock;
    color: string;
  } => {
    const sessionDateTime = new Date(`${sessionDate}T${startTime}`);
    const now = new Date();

    const earliestCheckIn = new Date(sessionDateTime.getTime() - 30 * 60 * 1000);
    const latestCheckIn = new Date(sessionDateTime.getTime() + 15 * 60 * 1000);

    if (now < earliestCheckIn) {
      return {
        status: 'early',
        message: 'Check-in is not open yet',
        icon: Clock,
        color: 'text-gray-600',
      };
    }

    if (now > latestCheckIn) {
      return {
        status: 'closed',
        message: 'Check-in closed',
        icon: AlertCircle,
        color: 'text-red-600',
      };
    }

    if (now <= sessionDateTime) {
      return {
        status: 'on-time',
        message: 'Check in now',
        icon: CheckCircle,
        color: 'text-green-600',
      };
    }

    return {
      status: 'late',
      message: 'You can check in (will be recorded as late)',
      icon: AlertCircle,
      color: 'text-yellow-600',
    };
  };

  /**
   * Handle check-in button click
   * Shows confirmation dialog if time window is valid
   */
  const handleCheckInClick = () => {
    const validation = validateCheckInWindow();

    if (!validation.valid) {
      addToast({
        title: 'Cannot check in',
        description: validation.message || 'Cannot check in at this time',
        variant: 'error',
      });
      if (onError) {
        onError(validation.message || 'Cannot check in at this time');
      }
      return;
    }

    setShowConfirmDialog(true);
  };

  /**
   * Handle check-in confirmation
   * Calls athleteCheckIn action and handles response
   */
  const handleConfirmCheckIn = async () => {
    setIsCheckingIn(true);
    setShowConfirmDialog(false);

    try {
      const result = await athleteCheckIn(sessionId);

      if (result.error) {
        addToast({
          title: 'An error occurred',
          description: result.error,
          variant: 'error',
        });
        if (onError) {
          onError(result.error);
        }
      } else {
        // Success
        addToast({
          title: 'Check-in successful!',
          description: 'You have checked in to this training session',
          variant: 'success',
        });
        if (onSuccess) {
          onSuccess();
        }
        // Refresh the page to show updated status
        setTimeout(() => {
          router.refresh();
        }, 1000);
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      addToast({
        title: 'An error occurred',
        description: errorMessage,
        variant: 'error',
      });
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  const timeStatus = getTimeStatus();
  const TimeIcon = timeStatus.icon;
  const isDisabled = disabled || isCheckingIn || timeStatus.status === 'early' || timeStatus.status === 'closed';

  return (
    <>
      {/* Check-in Button */}
      <div className="space-y-2">
        <Button
          onClick={handleCheckInClick}
          disabled={isDisabled}
          className={className || 'w-full'}
          size="lg"
        >
          {isCheckingIn ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Checking in...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              Check in
            </>
          )}
        </Button>

        {/* Time Status Indicator */}
        <div className={`flex items-center justify-center gap-2 text-sm ${timeStatus.color}`}>
          <TimeIcon className="h-4 w-4" />
          <span>{timeStatus.message}</span>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm check-in</DialogTitle>
            <DialogDescription asChild>
              <div>
                {sessionTitle && (
                  <div className="mt-2 mb-4">
                    <div className="font-medium text-gray-900">{sessionTitle}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {new Date(`${sessionDate}T${startTime}`).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                )}
                <div className="text-gray-700">
                  Check in to this training session?
                </div>
                {timeStatus.status === 'late' && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-700">
                        You are checking in after the start time Status will be recorded as "Late"
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isCheckingIn}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmCheckIn} disabled={isCheckingIn}>
              {isCheckingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking in...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
