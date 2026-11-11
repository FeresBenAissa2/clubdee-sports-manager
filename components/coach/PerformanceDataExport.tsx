'use client';

import { useState, useEffect } from 'react';
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
import { exportPerformanceDataCSV } from '@/lib/coach/report-actions';
import { getCoachAthletes } from '@/lib/coach/performance-actions';
import { TrendingUp } from 'lucide-react';
import { ExportButton } from './ExportButton';

export function PerformanceDataExport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('all');
  const [athletes, setAthletes] = useState<any[]>([]);

  // Set default date range (last 90 days)
  useEffect(() => {
    const today = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(ninetyDaysAgo.toISOString().split('T')[0]);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Export dataTest results
        </CardTitle>
        <CardDescription>
          Export athlete test results as CSV
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="perf-startDate">Start date</Label>
            <Input
              id="perf-startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="perf-endDate">End date</Label>
            <Input
              id="perf-endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="perf-athlete">Athletes</Label>
            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
              <SelectTrigger id="perf-athlete">
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
          <ExportButton
            onExportCSV={() =>
              exportPerformanceDataCSV({
                startDate,
                endDate,
                athleteId: selectedAthleteId === 'all' ? undefined : selectedAthleteId,
              })
            }
            filename="performance_data"
            disabled={!startDate || !endDate}
          />
        </div>
      </CardContent>
    </Card>
  );
}
