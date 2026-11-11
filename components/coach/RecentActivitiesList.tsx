'use client';

import { RecentActivity } from '@/lib/coach/dashboard-actions';
import { 
  Calendar, 
  FileText, 
  Trophy, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface RecentActivitiesListProps {
  activities: RecentActivity[];
}

export function RecentActivitiesList({ activities }: RecentActivitiesListProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No recent activity yet</p>
      </div>
    );
  }

  const getIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'session':
        return Calendar;
      case 'application':
        return FileText;
      case 'tournament':
        return Trophy;
      case 'performance':
        return TrendingUp;
      default:
        return Clock;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
      pending: { icon: AlertCircle, color: 'text-orange-600 bg-orange-50', label: 'Pending review' },
      approved: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Approve' },
      rejected: { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Reject' },
      open: { icon: CheckCircle, color: 'text-blue-600 bg-blue-50', label: 'Open for applications' },
      draft: { icon: AlertCircle, color: 'text-gray-600 bg-gray-50', label: 'Draft' },
    };

    const config = statusConfig[status];
    if (!config) return null;

    const StatusIcon = config.icon;
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${config.color}`}>
        <StatusIcon className="h-3 w-3" />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} Dated`;
    
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = getIcon(activity.type);
        const content = (
          <div className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-semibold text-black text-sm">{activity.title}</h4>
                {activity.status && getStatusBadge(activity.status)}
              </div>
              <p className="text-sm text-gray-600 mb-2 line-clamp-1">{activity.description}</p>
              <p className="text-xs text-gray-400">{formatTimestamp(activity.timestamp)}</p>
            </div>
          </div>
        );

        if (activity.link) {
          return (
            <Link key={activity.id} href={activity.link}>
              {content}
            </Link>
          );
        }

        return <div key={activity.id}>{content}</div>;
      })}
    </div>
  );
}
