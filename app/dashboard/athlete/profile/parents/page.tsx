import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ParentConnectionForm } from '@/components/athlete/ParentConnectionForm';
import { ParentConnectionList } from '@/components/athlete/ParentConnectionList';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

export default async function ParentConnectionsPage() {
  const db = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get athlete profile
  const { data: athlete, error: athleteError } = await db
    .from('athletes')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .single();

  if (athleteError || !athlete) {
    redirect('/dashboard/athlete');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/athlete/profile"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-black">Manage parents</h1>
              <p className="text-sm text-gray-500">
                Connect with a parent to receive notifications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                What will parents receive?
              </h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Notifications when they attend or miss training</li>
                <li>• Notifications for new test results</li>
                <li>• Notifications for leave requests and approvals</li>
                <li>• Important announcements from your coach</li>
                <li>• Notifications for goals and progress</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Add Parent Button */}
        <ParentConnectionForm />

        {/* Parent List */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4">Connected parents</h2>
          <ParentConnectionList />
        </div>

        {/* Help Section */}
        <div className="bg-gray-100 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            How to connect a parent
          </h3>
          <ol className="text-xs text-gray-700 space-y-2">
            <li>1. Click "Add parent" and fill in the details</li>
            <li>2. The system will send a confirmation email to the parent</li>
            <li>3. The parent clicks the link in the email to confirm</li>
            <li>4. Once confirmed, the parent will receive notifications</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
