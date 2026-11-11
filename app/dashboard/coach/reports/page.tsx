import { Suspense } from 'react';
import { AttendanceReportGenerator } from '@/components/coach/AttendanceReportGenerator';
import { PerformanceDataExport } from '@/components/coach/PerformanceDataExport';

export default function CoachReportsPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reports and data export</h1>
        <p className="mt-2 text-sm md:text-base text-gray-600">
          Generate reports and export attendance and test results for athletes in your club
        </p>
      </div>

      <div className="space-y-6">
        <Suspense fallback={<div>Loading...</div>}>
          <AttendanceReportGenerator />
        </Suspense>

        <Suspense fallback={<div>Loading...</div>}>
          <PerformanceDataExport />
        </Suspense>
      </div>
    </div>
  );
}
