'use client';

import { Calendar, Clock, MapPin, Users, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Database } from '@/types/database.types';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelSession } from '@/lib/coach/session-actions';
import { useToast } from '@/hooks/useToast';

type TrainingSession = Database['public']['Tables']['training_sessions']['Row'];

interface SessionCardProps {
  session: TrainingSession & { attendance_count?: number };
  onViewDetails?: (sessionId: string) => void;
  onEdit?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
}

export function SessionCard({
  session,
  onViewDetails,
  onEdit,
  onCancel,
}: SessionCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Handle delete
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to cancel this training session?')) {
      return;
    }

    setIsDeleting(true);
    const result = await cancelSession(session.id);
    
    if (result.error) {
      toast({
        title: 'An error occurred',
        description: result.error,
        variant: 'error',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Training session cancelled successfully',
        variant: 'success',
      });
      router.refresh();
    }
    setIsDeleting(false);
  };

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
    cancelled: {
      label: 'Cancel',
      className: 'bg-red-100 text-red-700',
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100 relative">
      {/* Header with Status and Actions */}
      <div className="flex items-start justify-between mb-3">
        <Link href={`/dashboard/coach/sessions/${session.id}`} className="flex-1">
          <h3 className="text-base font-bold text-black mb-1 line-clamp-1 hover:text-blue-600 transition-colors">
            {session.title}
          </h3>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${currentStatus.className}`}
          >
            {currentStatus.label}
          </span>
        </Link>

        {/* Quick Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/coach/sessions/${session.id}`);
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/coach/attendance/${session.id}`);
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              Take attendance
            </DropdownMenuItem>
            {status === 'scheduled' && (
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Cancelling...' : 'Cancel'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Session Info - Compact */}
      <Link href={`/dashboard/coach/sessions/${session.id}`}>
        <div className="space-y-2 mb-3">
          {/* Date & Time Combined */}
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0 text-black" />
            <span className="text-xs">
              {formatDate(session.session_date)}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2 flex-shrink-0 text-black" />
            <span className="text-xs">
              {formatTime(session.start_time)} - {formatTime(session.end_time)}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-black" />
            <span className="text-xs line-clamp-1">{session.location}</span>
          </div>
        </div>

        {/* Footer with Attendance */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Present</p>
              <p className="text-sm font-bold text-black">{session.attendance_count || 0} people</p>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            Tap to view details →
          </div>
        </div>
      </Link>
    </div>
  );
}
