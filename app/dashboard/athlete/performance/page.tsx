import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { PerformanceHistoryClient } from '@/components/athlete/PerformanceHistoryClient';
import { PerformanceTrendAnalysis } from '@/components/athlete/PerformanceTrendAnalysis';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PerformanceRecord {
  id: string;
  test_date: string;
  test_type: string;
  test_name: string;
  score: number;
  unit: string;
  notes?: string;
  coaches?: {
    first_name: string;
    last_name: string;
  };
}

export default async function PerformanceHistoryPage() {
  const db = await createClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get athlete profile
  const { data: profile } = (await db
    .from('athletes')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .single()) as { data: { id: string; first_name: string; last_name: string } | null };

  if (!profile) {
    redirect('/login');
  }

  // Get all performance records
  const { data: performanceRecords } = (await db
    .from('performance_records')
    .select(
      `
      *,
      coaches (
        first_name,
        last_name
      )
    `
    )
    .eq('athlete_id', profile.id)
    .order('test_date', { ascending: false })) as {
    data: PerformanceRecord[] | null;
  };

  // Group by test type for statistics
  const testTypes = Array.from(
    new Set(performanceRecords?.map((r) => r.test_type) || [])
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dashboard/athlete"
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Test results
              </h1>
              <p className="text-sm text-gray-600">
                View your test results and progress
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-purple-50 p-4">
              <p className="text-sm text-purple-600">All</p>
              <p className="mt-1 text-2xl font-bold text-purple-900">
                {performanceRecords?.length || 0}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-600">Test type</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">
                {testTypes.length}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-600">Latest</p>
              <p className="mt-1 text-sm font-bold text-green-900">
                {performanceRecords && performanceRecords.length > 0
                  ? new Date(
                      performanceRecords[0].test_date
                    ).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-6">
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="history">Test history</TabsTrigger>
            <TabsTrigger value="trends">Trend analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <PerformanceHistoryClient
              records={performanceRecords || []}
              testTypes={testTypes}
            />
          </TabsContent>

          <TabsContent value="trends">
            <PerformanceTrendAnalysis
              records={performanceRecords || []}
              testTypes={testTypes}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
