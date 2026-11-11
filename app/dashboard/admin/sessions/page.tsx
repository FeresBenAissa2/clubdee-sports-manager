import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { SessionsTable } from '@/components/admin/SessionsTable';
import { getAllSessions } from '@/lib/admin/attendance-actions';

export default async function AdminSessionsPage() {
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
    .single();

  // @ts-ignore - type inference issue
  if (roleError || !userRole || userRole.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all sessions
  const { data: sessions, error: sessionsError } = await getAllSessions();

  if (sessionsError) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">An error occurred: {sessionsError}</p>
        </div>
      </div>
    );
  }

  // Fetch all clubs for filter dropdown
  const { data: clubs, error: clubsError } = await db
    .from('clubs')
    .select('id, name')
    .order('name');

  if (clubsError) {
    console.error('Error fetching clubs:', clubsError);
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manage training schedule</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all training schedules in the system
        </p>
      </div>

      <SessionsTable sessions={sessions || []} clubs={clubs || []} />
    </div>
  );
}
