import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { NotificationList } from '@/components/athlete/NotificationList';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NotificationsPage() {
  const db = await createClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get notifications
  const { data: notifications, error } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

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
      </div>

      {/* Notifications */}
      <NotificationList notifications={notifications || []} />
    </div>
  );
}
