'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  generateAttendanceReport,
  exportAttendanceReportCSV,
  type AthleteAttendanceReport,
} from '@/lib/coach/report-actions';
import { getCoachAthletes } from '@/lib/coach/performance-actions';
import { FileText } from 'lucide-react';
import { useEffect } from 'react';
import { ExportButton } from './ExportButton';

export function AttendanceReportGenerator() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('all');
  const [athletes, setAthletes] = useState<any[]>([]);
  const [reportData, setReportData] = useState<AthleteAttendanceReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  // Load athletes
  useEffect(() => {
    async function loadAthletes() {
      const result = await getCoachAthletes();
      if (result.success && result.data) {
        setAthletes(result.data);
      }
    }
    loadAthletes();
  }, []);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select a date range');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await generateAttendanceReport({
      startDate,
      endDate,
      athleteId: selectedAthleteId === 'all' ? undefined : selectedAthleteId,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      setReportData([]);
    } else {
      setReportData(result.data || []);
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report parameters
          </CardTitle>
          <CardDescription>
            SelectRangeDateandAthletesRequiredViewReport
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="athlete">Athletes</Label>
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger id="athlete">
                  <SelectValue placeholder="Select athlete" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All athletes</SelectItem>
                  {athletes.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.first_name} {athlete.last_name}
                      {athlete.nickname && ` (${athlete.nickname})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handleGenerateReport} disabled={loading} className="w-full md:w-auto">
              {loading ? 'Generating report...' : 'Generate report'}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Report results</CardTitle>
                <CardDescription>
                  Attendance from {new Date(startDate).toLocaleDateString('en-US')} to{' '}
                  {new Date(endDate).toLocaleDateString('en-US')}
                </CardDescription>
              </div>
              <ExportButton
                onExportCSV={() =>
                  exportAttendanceReportCSV({
                    startDate,
                    endDate,
                    athleteId: selectedAthleteId === 'all' ? undefined : selectedAthleteId,
                  })
                }
                filename="attendance_report"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlete name</TableHead>
                    <TableHead className="text-center">All time</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                    <TableHead className="text-center">Excused</TableHead>
                    <TableHead className="text-center">Attendance rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row) => (
                    <TableRow key={row.athleteId}>
                      <TableCell className="font-medium">
                        {row.athleteName}
                        {row.nickname && (
                          <span className="text-gray-500 text-sm ml-1">({row.nickname})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{row.totalSessions}</TableCell>
                      <TableCell className="text-center text-green-600 font-medium">
                        {row.attended}
                      </TableCell>
                      <TableCell className="text-center text-red-600 font-medium">
                        {row.absent}
                      </TableCell>
                      <TableCell className="text-center text-yellow-600 font-medium">
                        {row.late}
                      </TableCell>
                      <TableCell className="text-center text-blue-600 font-medium">
                        {row.excused}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`font-semibold ${
                            row.attendanceRate >= 80
                              ? 'text-green-600'
                              : row.attendanceRate >= 60
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {row.attendanceRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary Statistics */}
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">All athletes</div>
                <div className="text-2xl font-bold text-gray-900">{reportData.length}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600">Average attendance rate</div>
                <div className="text-2xl font-bold text-green-600">
                  {(
                    reportData.reduce((sum, r) => sum + r.attendanceRate, 0) / reportData.length
                  ).toFixed(1)}
                  %
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">Total present</div>
                <div className="text-2xl font-bold text-blue-600">
                  {reportData.reduce((sum, r) => sum + r.attended, 0)}
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-sm text-gray-600">Total absent</div>
                <div className="text-2xl font-bold text-red-600">
                  {reportData.reduce((sum, r) => sum + r.absent, 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.length === 0 && !loading && !error && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Please select parameters and click "Generate report" ToViewResult</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
