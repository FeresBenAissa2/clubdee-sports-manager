'use client';

/**
 * Application List Component
 * 
 * Displays a list of membership applications in a table format.
 * Used by coaches and admins to view and manage applications.
 * 
 * Features:
 * - Table display with applicant name, sport, status, submitted date
 * - Filter by status (all/pending/approved/rejected)
 * - Sort by date (newest first)
 * - Clickable rows to view details
 * - Status badges with colors
 * - Empty state when no applications
 * 
 * Validates: Requirements US-3, US-7
 */

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react';

interface Application {
  id: string;
  user_id: string;
  club_id: string;
  personal_info: {
    full_name: string;
    phone_number: string;
    address: string;
    emergency_contact: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  created_at: string;
  clubs?: {
    name: string;
    sport_type: string | null;
  };
}

interface ApplicationListProps {
  applications: Application[];
  onViewDetails: (application: Application) => void;
  loading?: boolean;
}

export function ApplicationList({
  applications,
  onViewDetails,
  loading = false,
}: ApplicationListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    if (statusFilter === 'all') return true;
    return app.status === statusFilter;
  });

  // Sort by date (newest first)
  const sortedApplications = [...filteredApplications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: {
        label: 'Pending review',
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
      },
      approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
      },
      rejected: {
        label: 'Not approved',
        color: 'bg-red-100 text-red-800',
        icon: XCircle,
      },
      info_requested: {
        label: 'Request more information',
        color: 'bg-blue-100 text-blue-800',
        icon: FileText,
      },
    };

    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter by status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-gray-600">
          Showing {sortedApplications.length} of {applications.length}
        </span>
      </div>

      {/* Empty State */}
      {sortedApplications.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No applications</h3>
          <p className="text-gray-600">
            {statusFilter === 'all'
              ? 'No applications in the system yet'
              : `No applications with status "${statusFilter}"`}
          </p>
        </div>
      )}

      {/* Table */}
      {sortedApplications.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedApplications.map((app) => (
                <TableRow
                  key={app.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onViewDetails(app)}
                >
                  <TableCell className="font-medium">
                    {app.personal_info.full_name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{app.clubs?.name || 'N/A'}</div>
                      {app.clubs?.sport_type && (
                        <div className="text-sm text-gray-500">{app.clubs.sport_type}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell className="text-gray-600">
                    {formatDate(app.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default ApplicationList;
