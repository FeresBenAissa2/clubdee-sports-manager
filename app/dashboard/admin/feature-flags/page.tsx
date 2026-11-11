/**
 * Admin Feature Flags Management Page
 * 
 * Allows admins to:
 * - View all feature flags
 * - Enable/disable features
 * - Adjust rollout percentages
 * - Create new feature flags
 * 
 * Requirements: 20.8, 20.9
 */

import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FeatureFlagList } from '@/components/admin/FeatureFlagList';

export default async function FeatureFlagsPage() {
  const db = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: userRole } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single<{ role: string }>();

  if (!userRole || userRole.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all feature flags
  interface FeatureFlag {
    id: string;
    name: string;
    description: string | null;
    enabled: boolean;
    rollout_percentage: number;
    created_at: string;
    updated_at: string;
  }
  
  const { data: flags, error } = await db
    .from('feature_flags')
    .select('*')
    .order('name') as { data: FeatureFlag[] | null; error: any };

  if (error) {
    console.error('Error fetching feature flags:', error);
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Feature Flags</h1>
        <p className="text-muted-foreground mt-2">
          Manage feature rollouts and kill-switches for the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>
            Feature flags allow gradual rollout and instant disable of features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {flags?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Flags
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {flags?.filter(f => f.enabled).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Enabled
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {flags?.filter(f => !f.enabled).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Disabled
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Control feature availability and rollout percentages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flags && flags.length > 0 ? (
            <FeatureFlagList flags={flags} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No feature flags configured
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rollout Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Gradual Rollout Process</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Development: 0% - Test in development environment</li>
                <li>Internal Testing: 0% - Admin testing only</li>
                <li>Beta: 10-25% - Small user group testing</li>
                <li>Staged Rollout: 25% → 50% → 75% - Gradual increase</li>
                <li>Full Release: 100% - All users</li>
                <li>Cleanup: Remove flag after stable period</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Kill-Switch Usage</h3>
              <p className="text-sm text-muted-foreground">
                If a feature causes issues, disable it immediately by setting enabled to false.
                This will instantly disable the feature for all users regardless of rollout percentage.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
