import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ChevronLeft, TrendingUp, Plus, Activity } from 'lucide-react';
import Link from 'next/link';
import { PerformanceRecordForm } from '@/components/coach/PerformanceRecordForm';
import { PerformanceComparison } from '@/components/coach/PerformanceComparison';
import { getCoachAthletes, getPerformanceRecords } from '@/lib/coach/performance-actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function CoachPerformancePage() {
  const db = await createClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get coach profile
  const { data: coach } = await db
    .from('coaches')
    .select('id, club_id, first_name, last_name')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    redirect('/dashboard/coach');
  }

  // Get athletes and performance records
  const athletesResult = await getCoachAthletes();
  const recordsResult = await getPerformanceRecords();

  const athletes = athletesResult.data || [];
  const records = recordsResult.data || [];

  // Calculate statistics
  const totalRecords = records.length;
  const uniqueAthletes = new Set(records.map((r: any) => r.athlete_id)).size;
  const testTypes = new Set(records.map((r: any) => r.test_type)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/coach"
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Record test results
                </h1>
                <p className="text-sm text-gray-600">
                  Record and track athlete test results
                </p>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Record new result
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Record test results</DialogTitle>
                </DialogHeader>
                <PerformanceRecordForm athletes={athletes} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-purple-50 p-4">
              <p className="text-sm text-purple-600">All records</p>
              <p className="mt-1 text-2xl font-bold text-purple-900">
                {totalRecords}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-600">Athletes</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">
                {uniqueAthletes}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-600">Test type</p>
              <p className="mt-1 text-2xl font-bold text-green-900">
                {testTypes}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-6">
        <Tabs defaultValue="records" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="records">All records</TabsTrigger>
            <TabsTrigger value="comparison">Compare</TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <div className="rounded-lg bg-white shadow">
              {records.length > 0 ? (
                <div className="divide-y">
                  {records.map((record: any) => (
                    <div key={record.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="mt-1 rounded-full bg-purple-100 p-2">
                            <Activity className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {record.athletes?.first_name}{' '}
                              {record.athletes?.last_name}
                              {record.athletes?.nickname &&
                                ` (${record.athletes.nickname})`}
                            </h3>
                            <p className="mt-1 text-sm font-medium text-gray-700">
                              {record.test_type} - {record.test_name}
                            </p>
                            <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                              <span>
                                {new Date(record.test_date).toLocaleDateString(
                                  'en-US',
                                  {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  }
                                )}
                              </span>
                            </div>
                            {record.notes && (
                              <p className="mt-2 text-sm text-gray-600">
                                {record.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-600">
                            {record.score}
                          </p>
                          <p className="text-sm text-gray-600">{record.unit}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No test results recorded yet
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Start recording test results for athletes in your club
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <PerformanceComparison records={records} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
