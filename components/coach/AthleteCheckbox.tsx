'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { markAttendance } from '@/lib/coach/attendance-actions';
import { Database } from '@/types/database.types';
import { CheckCircle2, XCircle, Clock, UserX } from 'lucide-react';

type AttendanceStatus = Database['public']['Tables']['attendance']['Row']['status'];
type AttendanceLog = Database['public']['Tables']['attendance']['Row'];

interface AthleteCheckboxProps {
  athleteId: string;
  athleteName: string;
  athleteNickname?: string | null;
  sessionId: string;
  currentStatus?: AttendanceStatus;
  currentNotes?: string;
  onUpdate?: () => void;
}

const STATUS_OPTIONS: { 
  value: AttendanceStatus; 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  bgColor: string;
}[] = [
  { 
    value: 'present', 
    label: 'Present', 
    icon: <CheckCircle2 className="size-4" />, 
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200'
  },
  { 
    value: 'absent', 
    label: 'Absent', 
    icon: <XCircle className="size-4" />, 
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200'
  },
  { 
    value: 'excused', 
    label: 'Excused', 
    icon: <UserX className="size-4" />, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  { 
    value: 'late', 
    label: 'Late', 
    icon: <Clock className="size-4" />, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200'
  },
];

export function AthleteCheckbox({
  athleteId,
  athleteName,
  athleteNickname,
  sessionId,
  currentStatus,
  currentNotes = '',
  onUpdate,
}: AthleteCheckboxProps) {
  const [status, setStatus] = useState<AttendanceStatus | undefined>(currentStatus);
  const [notes, setNotes] = useState(currentNotes);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [error, setError] = useState<string>('');

  // Get current status option
  const currentStatusOption = STATUS_OPTIONS.find((opt) => opt.value === status);

  // Handle status change with auto-save
  const handleStatusChange = async (newStatus: AttendanceStatus) => {
    setStatus(newStatus);
    setIsSavingStatus(true);
    setError('');

    const result = await markAttendance({
      sessionId,
      athleteId,
      status: newStatus,
      notes,
    });

    setIsSavingStatus(false);

    if (result.error) {
      setError(result.error || 'Error saving status');
      // Revert status on error
      setStatus(currentStatus);
    } else {
      onUpdate?.();
    }
  };

  // Handle notes change with auto-save (debounced)
  const handleNotesBlur = async () => {
    // Only save if notes have changed
    if (notes === currentNotes) return;

    // Need a status to save notes
    const statusToUse = status || 'absent';

    setIsSavingNotes(true);
    setError('');

    const result = await markAttendance({
      sessionId,
      athleteId,
      status: statusToUse,
      notes,
    });

    setIsSavingNotes(false);

    if (result.error) {
      setError(result.error || 'Error saving notes');
      // Revert notes on error
      setNotes(currentNotes);
    } else {
      onUpdate?.();
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 space-y-3 transition-all ${
        currentStatusOption ? currentStatusOption.bgColor : 'bg-card hover:bg-accent/5'
      }`}
    >
      {/* Athlete Info & Status Toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{athleteName}</h3>
            {athleteNickname && (
              <span className="text-sm text-muted-foreground">({athleteNickname})</span>
            )}
          </div>
          {currentStatusOption && (
            <div className={`mt-1 flex items-center gap-1 ${currentStatusOption.color}`}>
              {currentStatusOption.icon}
              <span className="text-xs font-medium">{currentStatusOption.label}</span>
            </div>
          )}
        </div>

        {/* Status Toggle Buttons */}
        <div className="flex-shrink-0 w-36">
          <Select
            value={status || ''}
            onValueChange={(value) => handleStatusChange(value as AttendanceStatus)}
            disabled={isSavingStatus}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes Textarea */}
      <div className="space-y-1">
        <Label htmlFor={`notes-${athleteId}`} className="text-xs text-muted-foreground">
          Notes (Optional)
        </Label>
        <Textarea
          id={`notes-${athleteId}`}
          placeholder="Add notes, e.g. 10 minutes late, sick leave, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          disabled={isSavingNotes}
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      {/* Status Indicators */}
      <div className="flex items-center justify-between">
        {/* Saving Indicator */}
        {(isSavingStatus || isSavingNotes) && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <div className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Saving...</span>
          </div>
        )}

        {/* Success Indicator */}
        {!isSavingStatus && !isSavingNotes && !error && status && (
          <div className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            <span>SaveSo</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-xs text-red-600 flex items-center gap-1">
            <XCircle className="size-3" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
