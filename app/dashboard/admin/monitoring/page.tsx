import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';

export default async function MonitoringPage() {
  const db = await createClient();
  
  // Verify admin role
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/');
  
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };
  
  if (profile?.role !== 'admin') redirect('/dashboard');
  
  // Fetch frequent issues (24 hours)
  const errorStatsResult = await db.rpc('get_error_stats_24h');
  const errorStats = errorStatsResult.data;
  
  // Fetch latest errors
  const recentErrorsResult = await db
    .from('error_logs')
    .select(`
      id,
      error_type,
      error_code,
      error_message,
      created_at,
      page_url,
      user_id
    `)
    .order('created_at', { ascending: false })
    .limit(20);
  const recentErrors = recentErrorsResult.data as Array<{
    id: string;
    error_type: string;
    error_code: string | null;
    error_message: string;
    created_at: string;
    page_url: string | null;
    user_id: string | null;
  }> | null;
  
  // Fetch incomplete signups
  const incompleteRegsResult = await db
    .from('incomplete_registrations')
    .select('*')
    .limit(20);
  const incompleteRegs = incompleteRegsResult.data;
  
  // Fetch signup statistics
  const signupStatsResult = await db
    .from('auth.users')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  const signupStats = signupStatsResult.data;
  
  // Count auth users missing profiles
  const usersWithoutProfileResult = await db
    .from('auth.users')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .is('profiles.id', null);
  const usersWithoutProfile = usersWithoutProfileResult.count;
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Monitor issues and data</h1>
      </div>
      
      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Signups (7 days)</div>
          <div className="text-3xl font-bold">{signupStats?.length || 0}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Errors (24h)</div>
          <div className="text-3xl font-bold text-red-600">
            {recentErrors?.filter(e => 
              new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            ).length || 0}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Incomplete signups</div>
          <div className="text-3xl font-bold text-orange-600">
            {incompleteRegs?.length || 0}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Users without profile</div>
          <div className="text-3xl font-bold text-yellow-600">
            {usersWithoutProfile || 0}
          </div>
        </div>
      </div>
      
      {/* Latest errors */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Latest errors (20)</h2>
        
        {!recentErrors || recentErrors.length === 0 ? (
          <p className="text-gray-500">No errors 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentErrors.map((error) => (
                  <tr key={error.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(error.created_at).toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        error.error_type === 'rate_limit' ? 'bg-red-100 text-red-800' :
                        error.error_type === 'auth' ? 'bg-yellow-100 text-yellow-800' :
                        error.error_type === 'validation' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {error.error_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{error.error_code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">
                      {error.error_message}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {error.page_url || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Incomplete signups */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Incomplete signups</h2>
        
        {!incompleteRegs || incompleteRegs.length === 0 ? (
          <p className="text-gray-500">No incomplete signups ✅</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Steps completed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incompleteRegs.map((reg: any) => (
                  <tr key={reg.user_id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{reg.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(reg.last_attempt).toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {reg.completed_steps?.join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{reg.attempt_count}</td>
                    <td className="px-4 py-3 text-sm text-red-600 max-w-xs truncate">
                      {reg.last_error || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to sign in</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Review frequent errors to fix issues</li>
          <li>• Review incomplete signups to help users</li>
          <li>• Run the script for more details: <code className="bg-blue-100 px-2 py-1 rounded">./scripts/monitor-user-issues.sh</code></li>
        </ul>
      </div>
    </div>
  );
}
