'use client';

import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Award, Users } from 'lucide-react';
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

interface PerformanceRecord {
  id: string;
  test_date: string;
  test_type: string;
  test_name: string;
  score: number;
  unit: string;
  athlete_id: string;
  athletes?: {
    id: string;
    first_name: string;
    last_name: string;
    nickname: string | null;
  };
}

interface PerformanceComparisonProps {
  records: PerformanceRecord[];
}

interface AthleteStats {
  athleteId: string;
  athleteName: string;
  testCount: number;
  averageScore: number;
  bestScore: number;
  latestScore: number;
  latestDate: string;
}

interface TestTypeStats {
  testType: string;
  testName: string;
  unit: string;
  athleteStats: AthleteStats[];
}

export function PerformanceComparison({ records }: PerformanceComparisonProps) {
  const [selectedTestType, setSelectedTestType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'average' | 'best' | 'latest'>('average');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get unique test types
  const testTypes = useMemo(() => {
    const types = new Map<string, { testType: string; testName: string }>();
    records.forEach((record) => {
      const key = `${record.test_type}-${record.test_name}`;
      if (!types.has(key)) {
        types.set(key, {
          testType: record.test_type,
          testName: record.test_name,
        });
      }
    });
    return Array.from(types.values());
  }, [records]);

  // Calculate statistics by test type
  const testTypeStats = useMemo(() => {
    const statsMap = new Map<string, TestTypeStats>();

    records.forEach((record) => {
      const key = `${record.test_type}-${record.test_name}`;
      
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          testType: record.test_type,
          testName: record.test_name,
          unit: record.unit,
          athleteStats: [],
        });
      }

      const stats = statsMap.get(key)!;
      let athleteStats = stats.athleteStats.find(
        (a) => a.athleteId === record.athlete_id
      );

      if (!athleteStats) {
        athleteStats = {
          athleteId: record.athlete_id,
          athleteName: record.athletes
            ? `${record.athletes.first_name} ${record.athletes.last_name}${
                record.athletes.nickname ? ` (${record.athletes.nickname})` : ''
              }`
            : 'Unknown',
          testCount: 0,
          averageScore: 0,
          bestScore: record.score,
          latestScore: record.score,
          latestDate: record.test_date,
        };
        stats.athleteStats.push(athleteStats);
      }

      athleteStats.testCount++;
      athleteStats.bestScore = Math.max(athleteStats.bestScore, record.score);
      
      // Update latest if this record is more recent
      if (record.test_date >= athleteStats.latestDate) {
        athleteStats.latestScore = record.score;
        athleteStats.latestDate = record.test_date;
      }
    });

    // Calculate averages
    statsMap.forEach((stats) => {
      stats.athleteStats.forEach((athleteStats) => {
        const athleteRecords = records.filter(
          (r) =>
            r.athlete_id === athleteStats.athleteId &&
            r.test_type === stats.testType &&
            r.test_name === stats.testName
        );
        athleteStats.averageScore =
          athleteRecords.reduce((sum, r) => sum + r.score, 0) /
          athleteRecords.length;
      });
    });

    return Array.from(statsMap.values());
  }, [records]);

  // Filter by selected test type
  const filteredStats = useMemo(() => {
    if (selectedTestType === 'all') {
      return testTypeStats;
    }
    return testTypeStats.filter(
      (s) => `${s.testType}-${s.testName}` === selectedTestType
    );
  }, [testTypeStats, selectedTestType]);

  // Sort athletes within each test type
  const sortedStats = useMemo(() => {
    return filteredStats.map((stats) => ({
      ...stats,
      athleteStats: [...stats.athleteStats].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = a.athleteName.localeCompare(b.athleteName, 'th');
            break;
          case 'average':
            comparison = a.averageScore - b.averageScore;
            break;
          case 'best':
            comparison = a.bestScore - b.bestScore;
            break;
          case 'latest':
            comparison = a.latestScore - b.latestScore;
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      }),
    }));
  }, [filteredStats, sortBy, sortOrder]);

  if (records.length === 0) {
    return (
      <div className="rounded-lg bg-white p-12 text-center shadow">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No data yetAdequate
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Must be presentTest resultsAt least 1 itemsToShowingComparing
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Test Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Test type
            </label>
            <Select value={selectedTestType} onValueChange={setSelectedTestType}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {testTypes.map((type) => (
                  <SelectItem
                    key={`${type.testType}-${type.testName}`}
                    value={`${type.testType}-${type.testName}`}
                  >
                    {type.testType} - {type.testName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Sort by
            </label>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="average">Average score</SelectItem>
                <SelectItem value="best">Highest score</SelectItem>
                <SelectItem value="latest">Latest score</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Order
            </label>
            <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">High to low</SelectItem>
                <SelectItem value="asc">Low to high</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Comparison Tables */}
      <div className="space-y-6">
        {sortedStats.map((stats) => (
          <div
            key={`${stats.testType}-${stats.testName}`}
            className="rounded-lg bg-white shadow"
          >
            {/* Header */}
            <div className="border-b bg-gray-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {stats.testType}
                  </h3>
                  <p className="text-sm text-gray-600">{stats.testName}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{stats.athleteStats.length} Athletes</span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Athletes</TableHead>
                    <TableHead className="text-center">Attempts</TableHead>
                    <TableHead className="text-right">Average score</TableHead>
                    <TableHead className="text-right">Highest score</TableHead>
                    <TableHead className="text-right">Latest score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.athleteStats.map((athlete, index) => {
                    const isTopPerformer = index === 0 && sortBy !== 'name';
                    return (
                      <TableRow
                        key={athlete.athleteId}
                        className={isTopPerformer ? 'bg-yellow-50' : ''}
                      >
                        <TableCell className="font-medium">
                          {index + 1}
                          {isTopPerformer && (
                            <Award className="ml-1 inline h-4 w-4 text-yellow-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {athlete.athleteName}
                        </TableCell>
                        <TableCell className="text-center">
                          {athlete.testCount}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {athlete.averageScore.toFixed(2)} {stats.unit}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {athlete.bestScore.toFixed(2)} {stats.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {athlete.latestScore.toFixed(2)} {stats.unit}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>

      {filteredStats.length === 0 && (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Not found
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            None.Test resultsforTypeNo.Select
          </p>
        </div>
      )}
    </div>
  );
}
