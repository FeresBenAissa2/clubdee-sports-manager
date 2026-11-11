'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { requestLeave } from '@/lib/athlete/attendance-actions';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';

interface LeaveRequestFormProps {
  sessionId: string;
  sessionTitle?: string;
  sessionDate: string;
  startTime: string;
  disabled?: boolean;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * LeaveRequestForm Component
 * 
 * Reason textarea (min 10 characters)
 * Validate timing (at least 2 hours before session)
 * Call requestLeave action
 * Show submission status with toast notifications
 * 
 * Requirements: BR2
 */
export function LeaveRequestForm({
  sessionId,
  sessionTitle,
  sessionDate,
  startTime,
  disabled = false,
  className = '',
  onSuccess,
  onError,
}: LeaveRequestFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Validate timing - must be at least 2 hours before session
   * BR2: Must request leave at least 2 hours before session start
   */
  const validateTiming = (): { valid: boolean; message?: string } => {
    const sessionDateTime = new Date(`${sessionDate}T${startTime}`);
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    if (sessionDateTime < twoHoursFromNow) {
      const hoursUntil = Math.ceil((sessionDateTime.getTime() - now.getTime()) / (60 * 60 * 1000));
      return {
        valid: false,
        message: `Leave must be requested at least 2 hours before start time (time remaining ${hoursUntil} hours left)`,
      };
    }

    return { valid: true };
  };

  /**
   * Validate reason - must be at least 10 characters
   * BR2: Reason must not be empty (at least 10 characters)
   */
  const validateReason = (value: string): { valid: boolean; message?: string } => {
    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      return {
        valid: false,
        message: 'Please enter a reason.',
      };
    }

    if (trimmedValue.length < 10) {
      return {
        valid: false,
        message: `Enter at least 10 characters (current: ${trimmedValue.length} characters)`,
      };
    }

    return { valid: true };
  };

  /**
   * Handle reason input change with validation
   */
  const handleReasonChange = (value: string) => {
    setReason(value);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }

    // Show character count hint when approaching minimum
    const trimmedLength = value.trim().length;
    if (trimmedLength > 0 && trimmedLength < 10) {
      setValidationError(`Need ${10 - trimmedLength} more characters`);
    }
  };

  /**
   * Handle form submission
   * Validates reason and timing before showing confirmation dialog
   */
  const handleSubmit = () => {
    setValidationError(null);

    // Validate reason
    const reasonValidation = validateReason(reason);
    if (!reasonValidation.valid) {
      setValidationError(reasonValidation.message || 'Invalid reason');
      addToast({
        title: 'Invalid information',
        description: reasonValidation.message || 'Invalid reason',
        variant: 'error',
      });
      if (onError) {
        onError(reasonValidation.message || 'Invalid reason');
      }
      return;
    }

    // Validate timing
    const timingValidation = validateTiming();
    if (!timingValidation.valid) {
      addToast({
        title: 'Cannot submit leave request',
        description: timingValidation.message || 'Leave requests are not available right now.',
        variant: 'error',
      });
      if (onError) {
        onError(timingValidation.message || 'Leave requests are not available right now.');
      }
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  /**
   * Handle leave request confirmation
   * Calls requestLeave action and handles response
   */
  const handleConfirmLeaveRequest = async () => {
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      const result = await requestLeave({
        sessionId,
        reason: reason.trim(),
      });

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
          title: 'Leave request sent!',
          description: 'Your leave request was sent to your coach',
          variant: 'success',
        });
        setReason(''); // Clear form
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
      setIsSubmitting(false);
    }
  };

  /**
   * Get timing status for display
   */
  const getTimingStatus = (): {
    canRequest: boolean;
    message: string;
    color: string;
  } => {
    const validation = validateTiming();
    
    if (!validation.valid) {
      return {
        canRequest: false,
        message: validation.message || 'Cannot submit leave request',
        color: 'text-red-600',
      };
    }

    const sessionDateTime = new Date(`${sessionDate}T${startTime}`);
    const now = new Date();
    const hoursUntil = Math.floor((sessionDateTime.getTime() - now.getTime()) / (60 * 60 * 1000));

    return {
      canRequest: true,
      message: `You can request leave (time remaining ${hoursUntil} hours left)`,
      color: 'text-green-600',
    };
  };

  const timingStatus = getTimingStatus();
  const isDisabled = disabled || isSubmitting || !timingStatus.canRequest;
  const characterCount = reason.trim().length;

  return (
    <>
      {/* Leave Request Form */}
      <div className={`space-y-4 ${className}`}>
        {/* Timing Status */}
        <div className={`flex items-center gap-2 text-sm ${timingStatus.color}`}>
          <Clock className="h-4 w-4" />
          <span>{timingStatus.message}</span>
        </div>

        {/* Reason Textarea */}
        <div className="space-y-2">
          <Label htmlFor="leave-reason">
            Reason for leave <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="leave-reason"
            value={reason}
            onChange={(e) => handleReasonChange(e.target.value)}
            placeholder="Enter your reason for leave (at least 10 characters)"
            rows={4}
            disabled={isDisabled}
            className={validationError && characterCount < 10 ? 'border-red-300 focus:border-red-500' : ''}
          />
          
          {/* Character Count */}
          <div className="flex justify-between items-center text-xs">
            <span className={characterCount < 10 ? 'text-gray-500' : 'text-green-600'}>
              {characterCount} / 10 characters minimum
            </span>
            {validationError && characterCount < 10 && (
              <span className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationError}
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isDisabled || characterCount < 10}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting request...
            </>
          ) : (
            <>
              <AlertCircle className="mr-2 h-5 w-5" />
              Submit leave request
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm leave request</DialogTitle>
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
                <div className="text-gray-700 mb-3">
                  Submit a leave request for this session?
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">Reason:</div>
                  <div className="text-sm text-gray-600">{reason.trim()}</div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      Leave requests are sent to your coach for approval
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmLeaveRequest} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Confirm leave request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
