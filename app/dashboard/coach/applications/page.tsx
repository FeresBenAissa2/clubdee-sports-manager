'use client';

/**
 * Coach Applications Page
 * 
 * This page allows coaches to view and manage membership applications
 * for their sport/club. Coaches can approve or reject applications.
 * 
 * Features:
 * - Fetch applications using getClubApplications(clubId)
 * - Display stats cards: pending, approved, rejected counts
 * - Render ApplicationList component
 * - Handle view details (ApplicationDetailModal)
 * - Handle approve/reject actions
 * - Toast notifications for success/error
 * - Auto-refresh after actions
 * 
 * Validates: Requirements US-3, US-7
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/client';
import { getCoachApplications } from '@/lib/membership/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApplicationReviewCard } from '@/components/coach/ApplicationReviewCard';
import { Loader2, FileText, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Application {
  id: string;
  user_id: string;
  club_id: string;
  personal_info: any;
  documents: any[];
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  review_info?: any;
  activity_log: any[];
  profile_id?: string | null;
  created_at: string;
  updated_at: string;
  clubs?: {
    id: string;
    name: string;
    sport_type: string | null;
  };
}

export default function CoachApplicationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [coachClubIds, setCoachClubIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoading(true);

    try {
      const db = createClient();
      const { data: { user }, error: authError } = await db.auth.getUser();

      if (authError || !user) {
        toast({
          title: 'Please sign in',
          description: 'You must sign in to view applications',
          variant: 'error',
        });
        router.push('/login');
        return;
      }

      // All clubs this coach is linked to (not just the first row)
      const result = await getCoachApplications();

      if (result.error) {
        toast({
          title: 'An error occurred',
          description: result.error,
          variant: 'error',
        });
        setApplications([]);
        setCoachClubIds([]);
      } else {
        setApplications((result.data || []) as Application[]);
        setCoachClubIds(result.clubIds || []);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      toast({
        title: 'An error occurred',
        description: 'Could not load applications',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  // Filter applications based on status
  const filteredApplications = applications.filter((app) => {
    if (statusFilter === 'all') return true;
    return app.status === statusFilter;
  });

  // Calculate stats
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Membership applications</h1>
        <p className="text-gray-600 mt-1">
          Manage registration applications across your clubs
          {coachClubIds.length > 0 ? ` (${coachClubIds.length} club${coachClubIds.length > 1 ? 's' : ''})` : ''}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>All</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <FileText className="w-4 h-4 mr-1" />
              All applications
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending review</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-1" />
              Action required
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              Registered
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Not approved</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.rejected}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <XCircle className="w-4 h-4 mr-1" />
              Rejected
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Not approved</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              {statusFilter === 'all'
                ? 'No applications yet'
                : `No applications with status ${
                    statusFilter === 'pending'
                      ? 'Pending review'
                      : statusFilter === 'approved'
                      ? 'Approved'
                      : 'Not approved'
                  }`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <ApplicationReviewCard
              key={application.id}
              application={application as any}
              onReviewed={loadApplications}
            />
          ))}
        </div>
      )}
    </div>
  );
}
