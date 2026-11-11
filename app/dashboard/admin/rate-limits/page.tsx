'use client';

/**
 * Admin Rate Limit Management Page
 * 
 * Features:
 * - View recent signup attempts
 * - Identify potentially rate-limited IPs
 * - Manually create users to bypass rate limits
 * - Monitor signup activity
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  UserPlus, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/db/client';
import { useToast } from '@/hooks/useToast';

interface SignupAttempt {
  id: string;
  email: string;
  created_at: string;
  email_confirmed: boolean;
}

export default function RateLimitsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentSignups, setRecentSignups] = useState<SignupAttempt[]>([]);
  const [stats, setStats] = useState({
    last_hour: 0,
    last_24h: 0,
    status: 'Normal'
  });

  // Form state for manual user creation
  const [formData, setFormData] = useState({
    email: '',
    password: 'TestPassword123!',
    full_name: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const db = createClient();

      // Get recent signups
      const { data: users, error } = await db
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Calculate stats
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const signupsLastHour = users?.filter(
        (u: any) => new Date(u.created_at) > oneHourAgo
      ).length || 0;

      const signupsLast24h = users?.filter(
        (u: any) => new Date(u.created_at) > oneDayAgo
      ).length || 0;

      setStats({
        last_hour: signupsLastHour,
        last_24h: signupsLast24h,
        status: signupsLastHour > 5 ? 'May be rate limited' : 'Normal'
      });

      setRecentSignups(users || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'An error occurred',
        description: 'Could not load data',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({
      title: 'RefreshCompleted',
      description: 'Information updated',
    });
  }

  async function handleCreateUser() {
    if (!formData.email || !formData.full_name) {
      toast({
        title: 'Please complete all required fields',
        description: 'Email and full name are required',
        variant: 'error',
      });
      return;
    }

    setCreating(true);
    try {
      const db = createClient();

      // Use Admin API to create user (bypasses rate limiting)
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not create user');
      }

      toast({
        title: 'User created successfully! 🎉',
        description: `Account ${formData.email} was created successfully`,
      });

      // Reset form
      setFormData({
        email: '',
        password: 'TestPassword123!',
        full_name: '',
      });

      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'An error occurred',
        description: error.message || 'Could not create user',
        variant: 'error',
      });
    } finally {
      setCreating(false);
    }
  }

  function getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage rate limiting</h1>
          <p className="text-gray-600 mt-1">
            Review and manage registrations that may be rate limited
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Registrations in the last hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.last_hour}</div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.last_hour > 5 ? '⚠️ Rate limit exceeded' : 'Normal'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Registrations in the last 24 hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.last_24h}</div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              All {stats.last_24h} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              System status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                variant={stats.status === 'Normal' ? 'default' : 'destructive'}
                className="text-base px-3 py-1"
              >
                {stats.status}
              </Badge>
              {stats.status === 'Normal' ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.status === 'Normal' 
                ? 'No rate limiting issues' 
                : 'Some users may be blocked'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Manual User Creation (Bypass Rate Limit) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Create new user (bypass rate limit)
          </CardTitle>
          <CardDescription>
            Create an account without rate limits — for users who are blocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>How to use:</strong> When a user is rate limited, an admin can create an account using this form
                then send login details to the user
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full name *</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="First last name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  Initial password (user can change later)
                </p>
              </div>
            </div>

            <Button
              onClick={handleCreateUser}
              disabled={creating || !formData.email || !formData.full_name}
              className="w-full md:w-auto"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create user (bypass rate limit)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Signups */}
      <Card>
        <CardHeader>
          <CardTitle>Latest registrations</CardTitle>
          <CardDescription>
            Showing the 20 latest accounts — check for excessive signups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentSignups.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No registration data</p>
            ) : (
              recentSignups.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{signup.email}</p>
                    <p className="text-xs text-gray-500">
                      {getTimeAgo(signup.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {new Date(signup.created_at).toLocaleString('en-US')}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">🔒 What is rate limiting?</p>
            <p className="text-gray-600">
              The app limits sign-up and login attempts per IP address
              to prevent spam and abuse
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">⏰ When does the rate limit expire?</p>
            <p className="text-gray-600">
              Usually expires within 1–2 hours after the first signup attempt
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">💡 How to help blocked users</p>
            <p className="text-gray-600">
              1. Use the "Create new user" form above<br />
              2. Enter the user's email and name<br />
              3. Click "Create user" then send login details to the user
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
