'use client';

import { useState } from 'react';
import { Calendar, MapPin, Clock, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttendanceHistorySkeleton } from '@/components/ui/loading-skeletons';

interface TrainingSession {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

interface AttendanceRecord {
  id: string;
  training_session_id: string;
  status: 'present' | 'absent' | 'excused' | 'late';
  check_in_time: string | null;
  notes: string | null;
  created_at: string;
  training_sessions?: TrainingSession;
}

interface AttendanceHistoryProps {
  records: AttendanceRecord[];
  isLoading?: boolean;
}

export default function AttendanceHistory({ records, isLoading = false }: AttendanceHistoryProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Show loading skeleton
  if (isLoading) {
    return <AttendanceHistorySkeleton />;
  }

  // Filter records by date range
  const filteredRecords = records.filter((record) => {
    if (!record.training_sessions) return false;
    
    const sessionDate = new Date(record.training_sessions.session_date);
    
    if (startDate) {
      const start = new Date(startDate);
      if (sessionDate < start) return false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      if (sessionDate > end) return false;
    }
    
    return true;
  });

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          label: 'Present',
          dot: 'bg-green-500',
        };
      case 'late':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          label: 'Late',
          dot: 'bg-yellow-500',
        };
      case 'excused':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          label: 'Leave',
          dot: 'bg-blue-500',
        };
      case 'absent':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          label: 'Absent',
          dot: 'bg-red-500',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          label: status,
          dot: 'bg-gray-500',
        };
    }
  };

  // Format date in Thai
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  // Format time
  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5); // HH:MM
  };

  // Clear filters
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Attendance history</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filter data
          </Button>
        </div>

        {/* Date Range  filters */}
        {showFilters && (
          <div className="mt-4 space-y-3 rounded-lg border bg-gray-50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Start date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  End date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filteredRecords.length > 0 ? (
          <div className="space-y-4">
            {filteredRecords.map((record) => {
              const session = record.training_sessions;
              if (!session) return null;

              const statusBadge = getStatusBadge(record.status);

              return (
                <div
                  key={record.id}
                  className="rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    {/* Left side - Session info */}
                    <div className="flex items-start gap-3">
                      {/* Status dot */}
                      <div className="mt-1.5">
                        <div className={`h-3 w-3 rounded-full ${statusBadge.dot}`} />
                      </div>

                      {/* Session details */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {session.title}
                        </h3>

                        {/* Date */}
                        <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(session.session_date)}</span>
                        </div>

                        {/* Time */}
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatTime(session.start_time)} - {formatTime(session.end_time)}
                          </span>
                        </div>

                        {/* Location */}
                        {session.location && (
                          <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>{session.location}</span>
                          </div>
                        )}

                        {/* Description */}
                        {session.description && (
                          <div className="mt-2">
                            <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                              {session.description}
                            </span>
                          </div>
                        )}

                        {/* Check-in time */}
                        {record.check_in_time && (
                          <p className="mt-2 text-xs text-gray-500">
                            Check-in time:{' '}
                            {new Date(record.check_in_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}

                        {/* Notes */}
                        {record.notes && (
                          <p className="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-600">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side - Status badge */}
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${statusBadge.bg} ${statusBadge.text}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {records.length === 0
                ? 'No attendance history yet'
                : 'No data found for the selected period'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {records.length === 0
                ? 'When you attend training, history will appear here'
                : 'Try changing the filtered date range'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
