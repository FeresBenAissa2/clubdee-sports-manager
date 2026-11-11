import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { getAllApplications, getAvailableClubs } from '@/lib/membership/queries';
import AdminApplicationsDashboard from '../../../../components/admin/AdminApplicationsDashboard';
import { FileText } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    clubId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function AdminApplicationsPage({ searchParams }: PageProps) {
  const db = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Verify user is admin
  const { data: userRole, error: roleError } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleError || !userRole || (userRole as any).role !== 'admin') {
    redirect('/dashboard');
  }

  // Get filters from search params
  const params = await searchParams;
  const filters = {
    clubId: params.clubId,
    status: params.status as any,
    startDate: params.startDate,
    endDate: params.endDate,
  };

  // Fetch all applications with filters
  const { data: applications, error: applicationsError } = await getAllApplications(filters);

  // Fetch available clubs for filter dropdown
  const { data: clubs, error: clubsError } = await getAvailableClubs();

  // Handle errors
  if (applicationsError || clubsError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 shadow-lg">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-2xl font-bold">Manage membership applications</h1>
          </div>
        </div>
        <div className="mx-auto max-w-7xl p-6">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-red-800">
              An error occurred while loading data: {applicationsError || clubsError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 shadow-lg">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-white/20 p-3">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Manage membership applications</h1>
                <p className="text-indigo-100 text-sm mt-1">
                  View and manage all applications in the system
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-6">
        <AdminApplicationsDashboard
          applications={applications || []}
          clubs={clubs || []}
          initialFilters={filters}
        />
      </div>
    </div>
  );
}
