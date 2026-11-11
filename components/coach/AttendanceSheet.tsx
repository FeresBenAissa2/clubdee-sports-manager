'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
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
import { Search, CheckCircle2, XCircle, Clock, UserX } from 'lucide-react';

type AttendanceStatus = Database['public']['Tables']['attendance']['Row']['status'];
type AttendanceLog = Database['public']['Tables']['attendance']['Row'];

interface AthleteWithAttendance {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  attendance?: AttendanceLog;
}

interface AttendanceSheetProps {
  sessionId: string;
  athletes: AthleteWithAttendance[];
  onUpdate?: () => void;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'present', label: 'Present', icon: <CheckCircle2 className="size-4" />, color: 'text-green-600' },
  { value: 'absent', label: 'Absent', icon: <XCircle className="size-4" />, color: 'text-red-600' },
  { value: 'excused', label: 'Excused', icon: <UserX className="size-4" />, color: 'text-blue-600' },
  { value: 'late', label: 'Late', icon: <Clock className="size-4" />, color: 'text-yellow-600' },
];

export function AttendanceSheet({ sessionId, athletes, onUpdate }: AttendanceSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter athletes based on search query
  const filteredAthletes = useMemo(() => {
    if (!searchQuery.trim()) return athletes;

    const query = searchQuery.toLowerCase();
    return athletes.filter((athlete) => {
      const fullName = `${athlete.first_name} ${athlete.last_name}`.toLowerCase();
      const nickname = athlete.nickname?.toLowerCase() || '';
      return fullName.includes(query) || nickname.includes(query);
    });
  }, [athletes, searchQuery]);

  // Handle status change with real-time save
  const handleStatusChange = async (athleteId: string, status: AttendanceStatus) => {
    setSavingStates((prev) => ({ ...prev, [athleteId]: true }));
    setErrors((prev) => ({ ...prev, [athleteId]: '' }));

    const result = await markAttendance({
      sessionId,
      athleteId,
      status,
    });

    setSavingStates((prev) => ({ ...prev, [athleteId]: false }));

    if (result.error) {
      setErrors((prev) => ({ ...prev, [athleteId]: result.error || 'An error occurred' }));
    } else {
      // Call onUpdate callback to refresh data
      onUpdate?.();
    }
  };

  // Handle notes change with real-time save
  const handleNotesChange = async (athleteId: string, notes: string) => {
    const athlete = athletes.find((a) => a.id === athleteId);
    const currentStatus = athlete?.attendance?.status || 'absent';

    setSavingStates((prev) => ({ ...prev, [`${athleteId}-notes`]: true }));
    setErrors((prev) => ({ ...prev, [`${athleteId}-notes`]: '' }));

    const result = await markAttendance({
      sessionId,
      athleteId,
      status: currentStatus,
      notes,
    });

    setSavingStates((prev) => ({ ...prev, [`${athleteId}-notes`]: false }));

    if (result.error) {
      setErrors((prev) => ({ ...prev, [`${athleteId}-notes`]: result.error || 'An error occurred' }));
    } else {
      onUpdate?.();
    }
  };

  // Get status badge
  const getStatusBadge = (status?: AttendanceStatus) => {
    if (!status) return null;
    const option = STATUS_OPTIONS.find((opt) => opt.value === status);
    if (!option) return null;

    return (
      <div className={`flex items-center gap-1 ${option.color}`}>
        {option.icon}
        <span className="text-xs font-medium">{option.label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="space-y-2">
        <Label htmlFor="search">SearchAthletes</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="search"
            type="text"
            placeholder="Search by name or nickname..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Athletes List */}
      <div className="space-y-3">
        {filteredAthletes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No athletes match your search' : 'There are no Athletes in the Club.'}
          </div>
        ) : (
          filteredAthletes.map((athlete) => {
            const currentStatus = athlete.attendance?.status;
            const currentNotes = athlete.attendance?.notes || '';
            const isSaving = savingStates[athlete.id];
            const isSavingNotes = savingStates[`${athlete.id}-notes`];
            const error = errors[athlete.id];
            const notesError = errors[`${athlete.id}-notes`];

            return (
              <div
                key={athlete.id}
                className="border rounded-lg p-4 space-y-3 bg-card hover:bg-accent/5 transition-colors"
              >
                {/* Athlete Info & Status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">
                        {athlete.first_name} {athlete.last_name}
                      </h3>
                      {athlete.nickname && (
                        <span className="text-sm text-muted-foreground">({athlete.nickname})</span>
                      )}
                    </div>
                    {currentStatus && (
                      <div className="mt-1">{getStatusBadge(currentStatus)}</div>
                    )}
                  </div>

                  {/* Status Selector */}
                  <div className="flex-shrink-0 w-32">
                    <Select
                      value={currentStatus || ''}
                      onValueChange={(value) => handleStatusChange(athlete.id, value as AttendanceStatus)}
                      disabled={isSaving}
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

                {/* Notes Input */}
                <div className="space-y-1">
                  <Label htmlFor={`notes-${athlete.id}`} className="text-xs text-muted-foreground">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id={`notes-${athlete.id}`}
                    placeholder="Add notes..."
                    value={currentNotes}
                    onChange={(e) => handleNotesChange(athlete.id, e.target.value)}
                    disabled={isSavingNotes}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>

                {/* Saving Indicator */}
                {(isSaving || isSavingNotes) && (
                  <div className="text-xs text-muted-foreground">Saving...</div>
                )}

                {/* Error Message */}
                {(error || notesError) && (
                  <div className="text-xs text-red-600">{error || notesError}</div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {filteredAthletes.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredAthletes.length} of {athletes.length} people
          </div>
        </div>
      )}
    </div>
  );
}
