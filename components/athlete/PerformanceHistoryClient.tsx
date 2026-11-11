'use client';

import { useState, useMemo } from 'react';
import { Activity, TrendingUp, Filter, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

interface PerformanceHistoryClientProps {
  records: PerformanceRecord[];
  testTypes: string[];
}

export function PerformanceHistoryClient({
  records,
  testTypes,
}: PerformanceHistoryClientProps) {
  const [selectedTestType, setSelectedTestType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'none' | 'test_type'>('none');

  // Filter records
  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    // Filter by test type
    if (selectedTestType !== 'all') {
      filtered = filtered.filter((r) => r.test_type === selectedTestType);
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter((r) => r.test_date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((r) => r.test_date <= endDate);
    }

    return filtered;
  }, [records, selectedTestType, startDate, endDate]);

  // Group records by test type
  const groupedRecords = useMemo(() => {
    if (groupBy === 'none') {
      return { all: filteredRecords };
    }

    const groups: Record<string, PerformanceRecord[]> = {};
    filteredRecords.forEach((record) => {
      const key = record.test_type;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });

    return groups;
  }, [filteredRecords, groupBy]);

  const hasFilters = selectedTestType !== 'all' || startDate || endDate;

  return (
    <div className="space-y-6">
      {/*  Filters */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filter</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Test Type  filters */}
          <div className="space-y-2">
            <Label htmlFor="testType">Test type</Label>
            <Select value={selectedTestType} onValueChange={setSelectedTestType}>
              <SelectTrigger id="testType">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {testTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date  filters */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Start date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date  filters */}
          <div className="space-y-2">
            <Label htmlFor="endDate">End date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Group by */}
        <div className="mt-4 space-y-2">
          <Label htmlFor="groupBy">Group by</Label>
          <Select
            value={groupBy}
            onValueChange={(value) => setGroupBy(value as 'none' | 'test_type')}
          >
            <SelectTrigger id="groupBy" className="w-full md:w-64">
              <SelectValue placeholder="No grouping" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              <SelectItem value="test_type">Group by test type</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear  Filters */}
        {hasFilters && (
          <div className="mt-4">
            <button
              onClick={() => {
                setSelectedTestType('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="rounded-lg bg-white shadow">
        {filteredRecords.length > 0 ? (
          <div>
            {Object.entries(groupedRecords).map(([groupKey, groupRecords]) => (
              <div key={groupKey}>
                {groupBy !== 'none' && (
                  <div className="border-b bg-gray-50 px-6 py-3">
                    <h3 className="font-semibold text-gray-900">{groupKey}</h3>
                    <p className="text-sm text-gray-600">
                      {groupRecords.length} List
                    </p>
                  </div>
                )}
                <div className="divide-y">
                  {groupRecords.map((record) => (
                    <div key={record.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="mt-1 rounded-full bg-purple-100 p-2">
                            <Activity className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {record.test_type}
                            </h3>
                            <p className="mt-1 text-sm font-medium text-gray-700">
                              {record.test_name}
                            </p>
                            <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(record.test_date).toLocaleDateString(
                                  'en-US',
                                  {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  }
                                )}
                              </span>
                              {record.coaches && (
                                <span className="text-gray-500">
                                  By {record.coaches.first_name}{' '}
                                  {record.coaches.last_name}
                                </span>
                              )}
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
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {hasFilters
                ? 'No test results match your filters.'
                : 'No test results yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {hasFilters
                ? 'Try adjusting filters to see other test results'
                : 'When your coach records your test results, they will appear here'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
