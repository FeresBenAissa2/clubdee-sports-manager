'use client';

import { MembershipApplication, ApplicationStatus } from '@/types/database.types';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface ApplicationWithClub extends MembershipApplication {
  clubs?: {
    id: string;
    name: string;
    sport_type: string;
    description?: string;
  };
}

interface ApplicationStatusCardProps {
  application: ApplicationWithClub;
  onViewDetails: (application: ApplicationWithClub) => void;
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
  approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
  info_requested: {
    label: 'Info requested',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: AlertCircle,
  },
};

export function ApplicationStatusCard({
  application,
  onViewDetails,
}: ApplicationStatusCardProps) {
  const statusConfig = STATUS_CONFIG[application.status];
  const StatusIcon = statusConfig.icon;
  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString));

  const clubName = application.clubs?.name || 'Unknown club';
  const sportType = application.clubs?.sport_type || '';
  const reviewInfo =
    typeof application.review_info === 'object' && application.review_info !== null
      ? (application.review_info as any)
      : null;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-gray-300"
      onClick={() => onViewDetails(application)}
    >
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{clubName}</h3>
            {sportType ? <p className="text-sm text-gray-600 mt-1">{sportType}</p> : null}
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color} text-sm font-medium`}
          >
            <StatusIcon className="h-4 w-4" />
            <span>{statusConfig.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>Submitted: {formatDate(application.created_at)}</span>
        </div>
        {application.status === 'rejected' && reviewInfo?.notes ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-900 mb-1">Rejection reason:</p>
            <p className="text-sm text-red-700">{reviewInfo.notes}</p>
          </div>
        ) : null}
        <p className="text-xs text-gray-500 text-center border-t pt-2">Click to view details</p>
      </CardContent>
    </Card>
  );
}
