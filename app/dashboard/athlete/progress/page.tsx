import { Suspense } from 'react';
import { getMyProgressReports } from '@/lib/progress/actions';
import ProgressReportsList from '@/components/athlete/ProgressReportsList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Progress reports | Sports club management system',
  description: 'View your progress reports and development',
};

export default async function AthleteProgressPage() {
  const result = await getMyProgressReports();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progress reports</h1>
        <p className="text-muted-foreground mt-2">
          View progress reports prepared by your coach
        </p>
      </div>

      {result.success && result.data.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No reports yet</CardTitle>
            <CardDescription>
              Your coach has not created a progress report yet
              Reports will appear here when your coach creates and publishes them
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Suspense fallback={<div>Loading...</div>}>
          <ProgressReportsList reports={result.data || []} />
        </Suspense>
      )}
    </div>
  );
}
