import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { LeaveRequestHistory } from '@/components/athlete/LeaveRequestHistory';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function LeaveHistoryPage() {
  const db = await createClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get athlete profile
  const { data: profile } = await db
    .from('athletes')
    .select('id')
    .eq('user_id', user.id)
    .single<{ id: string }>();

  if (!profile) {
    redirect('/dashboard/athlete');
  }

  // Get leave request history using the view
  const { data: requests, error } = await (db as any)
    .from('leave_request_history')
    .select('*')
    .eq('athlete_id', profile.id)
    .order('requested_at', { ascending: false });

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/athlete"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Leave history</h1>
        <p className="text-gray-600 mt-1">View leave history and approval status</p>
      </div>

      {/* Leave Request History */}
      <LeaveRequestHistory requests={requests || []} />
    </div>
  );
}
