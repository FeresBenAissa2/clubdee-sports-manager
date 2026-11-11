import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';

export default async function DevicesPage() {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get all login sessions with user info
  const { data: sessions } = await db
    .from('login_sessions')
    .select(`
      *,
      user:user_id (
        email
      )
    `)
    .order('login_at', { ascending: false })
    .limit(100);

  // Get device statistics
  const { data: deviceStats } = await db.rpc('get_device_statistics');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Device Tracking</h1>
        <p className="text-gray-600 mt-1">Track device usage in the system</p>
      </div>

      {/* Device Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Device statistics</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Device ID
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Login count
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Login Latest
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  CountCheck in
                </th>
              </tr>
            </thead>
            <tbody>
              {(deviceStats as any)?.map((stat: any) => (
                <tr key={stat.device_id} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm font-mono text-gray-900">
                    {stat.device_id}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {stat.login_count}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {stat.last_login
                      ? new Date(stat.last_login).toLocaleString('en-US')
                      : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {stat.check_in_count || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Login Sessions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Login Sessions Latest
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Device ID
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Platform
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Login
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Logout
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions?.map((session: any) => (
                <tr key={session.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {session.user?.email || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-700">
                    {session.device_id}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {session.device_info?.platform || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {new Date(session.login_at).toLocaleString('en-US')}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {session.logout_at
                      ? new Date(session.logout_at).toLocaleString('en-US')
                      : '-'}
                  </td>
                  <td className="py-3 px-4">
                    {session.logout_at ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        Logged out
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
