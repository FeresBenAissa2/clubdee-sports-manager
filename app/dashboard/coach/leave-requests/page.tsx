import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { LeaveRequestList } from '@/components/coach/LeaveRequestList';
import { getCoachLeaveRequests } from '@/lib/coach/attendance-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, XCircle, List } from 'lucide-react';

export default async function CoachLeaveRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const db = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Verify user is coach
  const { data: userRole, error: roleError } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (roleError || !userRole || (userRole as any).role !== 'coach') {
    redirect('/dashboard');
  }

  const filter = ((await searchParams).filter as 'pending' | 'approved' | 'rejected' | 'all') || 'pending';

  // Fetch leave requests
  const { data: allRequests, error: requestsError } = await getCoachLeaveRequests({ status: 'all' });

  if (requestsError) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">An error occurred: {requestsError}</p>
        </div>
      </div>
    );
  }

  const requests = allRequests || [];
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const approvedRequests = requests.filter((r) => r.status === 'approved');
  const rejectedRequests = requests.filter((r) => r.status === 'rejected');

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Leave requests</h1>
        <p className="text-muted-foreground mt-2">
          Manage leave requests from athletes in your club
        </p>
      </div>

      <Tabs defaultValue={filter} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Pending review</span>
            {pendingRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Approve</span>
            {approvedRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                {approvedRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span>Reject</span>
            {rejectedRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {rejectedRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            <span>All</span>
            {requests.length > 0 && (
              <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {requests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <LeaveRequestList requests={pendingRequests} filter="pending" />
        </TabsContent>

        <TabsContent value="approved">
          <LeaveRequestList requests={approvedRequests} filter="approved" />
        </TabsContent>

        <TabsContent value="rejected">
          <LeaveRequestList requests={rejectedRequests} filter="rejected" />
        </TabsContent>

        <TabsContent value="all">
          <LeaveRequestList requests={requests} filter="all" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
