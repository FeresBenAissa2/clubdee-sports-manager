'use client';

import { ActivityLogEntry } from '@/types/database.types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  UserCheck,
  AlertCircle,
  Send,
} from 'lucide-react';

interface ActivityTimelineProps {
  activityLog: ActivityLogEntry[];
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getActionIcon(action: string, entry: ActivityLogEntry) {
  switch (action) {
    case 'submitted':
      return { icon: Send, color: 'text-blue-500', bgColor: 'bg-blue-50' };
    case 'status_changed':
      if (entry.to === 'approved') {
        return { icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-50' };
      }
      if (entry.to === 'rejected') {
        return { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50' };
      }
      return { icon: AlertCircle, color: 'text-yellow-500', bgColor: 'bg-yellow-50' };
    case 'document_uploaded':
      return { icon: FileText, color: 'text-purple-500', bgColor: 'bg-purple-50' };
    case 'profile_created':
      return { icon: UserCheck, color: 'text-green-500', bgColor: 'bg-green-50' };
    default:
      return { icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-50' };
  }
}

function getActionDescription(entry: ActivityLogEntry): string {
  const role =
    { admin: 'Admin', coach: 'Coach', athlete: 'Athlete' }[entry.by_role] || entry.by_role;
  switch (entry.action) {
    case 'submitted':
      return 'Application submitted';
    case 'status_changed':
      return `${role} changed status from "${entry.from || ''}" to "${entry.to || ''}"`;
    case 'document_uploaded':
      return `Uploaded ${entry.details?.document_type || 'document'}`;
    case 'profile_created':
      return `${role} created athlete profile`;
    default:
      return entry.details?.message || entry.action;
  }
}

export default function ActivityTimeline({ activityLog }: ActivityTimelineProps) {
  const sortedLog = [...activityLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sortedLog.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedLog.map((entry, index) => {
        const { icon: Icon, color, bgColor } = getActionIcon(entry.action, entry);
        return (
          <div key={index} className="relative flex gap-4">
            {index < sortedLog.length - 1 ? (
              <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200" />
            ) : null}
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full ${bgColor} flex items-center justify-center z-10`}
            >
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="flex-1 pb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-900">
                  {getActionDescription(entry)}
                </p>
                {entry.notes ? (
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                    <span className="font-medium">Note:</span> {entry.notes}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-gray-400">{formatTimestamp(entry.timestamp)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
