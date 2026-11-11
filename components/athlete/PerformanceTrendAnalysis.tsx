'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Award, BarChart3 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface PerformanceRecord {
  id: string;
  test_date: string;
  test_type: string;
  test_name: string;
  score: number;
  unit: string;
  notes?: string;
}

interface PerformanceTrendAnalysisProps {
  records: PerformanceRecord[];
  testTypes: string[];
}

interface TrendData {
  testType: string;
  testName: string;
  unit: string;
  count: number;
  bestScore: number;
  averageScore: number;
  latestScore: number;
  improvement: number;
  improvementPercentage: number;
  trend: 'up' | 'down' | 'stable';
  records: PerformanceRecord[];
}

export function PerformanceTrendAnalysis({
  records,
  testTypes,
}: PerformanceTrendAnalysisProps) {
  const [selectedTestType, setSelectedTestType] = useState<string>('all');

  // Calculate trends for each test type
  const trends = useMemo(() => {
    const trendMap = new Map<string, TrendData>();

    records.forEach((record) => {
      const key = `${record.test_type}-${record.test_name}`;
      
      if (!trendMap.has(key)) {
        trendMap.set(key, {
          testType: record.test_type,
          testName: record.test_name,
          unit: record.unit,
          count: 0,
          bestScore: record.score,
          averageScore: 0,
          latestScore: record.score,
          improvement: 0,
          improvementPercentage: 0,
          trend: 'stable',
          records: [],
        });
      }

      const trend = trendMap.get(key)!;
      trend.records.push(record);
    });

    // Calculate statistics for each trend
    const trendsArray: TrendData[] = [];
    trendMap.forEach((trend) => {
      // Sort records by date (oldest first)
      trend.records.sort((a, b) => 
        new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
      );

      trend.count = trend.records.length;
      
      // Calculate best score (assuming higher is better for most tests)
      trend.bestScore = Math.max(...trend.records.map(r => r.score));
      
      // Calculate average
      trend.averageScore = 
        trend.records.reduce((sum, r) => sum + r.score, 0) / trend.count;
      
      // Latest score
      trend.latestScore = trend.records[trend.records.length - 1].score;
      
      // Calculate improvement (latest vs first)
      if (trend.count > 1) {
        const firstScore = trend.records[0].score;
        trend.improvement = trend.latestScore - firstScore;
        trend.improvementPercentage = 
          firstScore !== 0 ? (trend.improvement / firstScore) * 100 : 0;
        
        // Determine trend direction
        if (Math.abs(trend.improvementPercentage) < 1) {
          trend.trend = 'stable';
        } else if (trend.improvement > 0) {
          trend.trend = 'up';
        } else {
          trend.trend = 'down';
        }
      }

      trendsArray.push(trend);
    });

    return trendsArray;
  }, [records]);

  // Filter trends by selected test type
  const filteredTrends = useMemo(() => {
    if (selectedTestType === 'all') {
      return trends;
    }
    return trends.filter(t => t.testType === selectedTestType);
  }, [trends, selectedTestType]);

  // Sort by improvement percentage (descending)
  const sortedTrends = useMemo(() => {
    return [...filteredTrends].sort((a, b) => 
      b.improvementPercentage - a.improvementPercentage
    );
  }, [filteredTrends]);

  if (records.length === 0) {
    return (
      <div className="rounded-lg bg-white p-12 text-center shadow">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          Not enough data yet
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          At least one test result is required to show trend analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/*  filters */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Trend analysis
          </h2>
          <div className="w-64">
            <Select value={selectedTestType} onValueChange={setSelectedTestType}>
              <SelectTrigger>
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
        </div>
      </div>

      {/* Trends */}
      <div className="grid gap-6 md:grid-cols-2">
        {sortedTrends.map((trend) => (
          <div key={`${trend.testType}-${trend.testName}`} className="rounded-lg bg-white p-6 shadow">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{trend.testType}</h3>
                  <p className="text-sm text-gray-600">{trend.testName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {trend.trend === 'up' && (
                    <div className="rounded-full bg-green-100 p-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                  {trend.trend === 'down' && (
                    <div className="rounded-full bg-red-100 p-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                  )}
                  {trend.trend === 'stable' && (
                    <div className="rounded-full bg-gray-100 p-2">
                      <Minus className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-3">
              {/* Best Score */}
              <div className="flex items-center justify-between rounded-lg bg-yellow-50 p-3">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">
                    Best score
                  </span>
                </div>
                <span className="text-lg font-bold text-yellow-900">
                  {trend.bestScore.toFixed(2)} {trend.unit}
                </span>
              </div>

              {/* Average Score */}
              <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
                <span className="text-sm font-medium text-blue-900">
                  Average score
                </span>
                <span className="text-lg font-bold text-blue-900">
                  {trend.averageScore.toFixed(2)} {trend.unit}
                </span>
              </div>

              {/* Latest Score */}
              <div className="flex items-center justify-between rounded-lg bg-purple-50 p-3">
                <span className="text-sm font-medium text-purple-900">
                  Latest score
                </span>
                <span className="text-lg font-bold text-purple-900">
                  {trend.latestScore.toFixed(2)} {trend.unit}
                </span>
              </div>

              {/* Improvement */}
              {trend.count > 1 && (
                <div className={`flex items-center justify-between rounded-lg p-3 ${
                  trend.trend === 'up' ? 'bg-green-50' :
                  trend.trend === 'down' ? 'bg-red-50' :
                  'bg-gray-50'
                }`}>
                  <span className={`text-sm font-medium ${
                    trend.trend === 'up' ? 'text-green-900' :
                    trend.trend === 'down' ? 'text-red-900' :
                    'text-gray-900'
                  }`}>
                    Improvement
                  </span>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${
                      trend.trend === 'up' ? 'text-green-900' :
                      trend.trend === 'down' ? 'text-red-900' :
                      'text-gray-900'
                    }`}>
                      {trend.improvement > 0 ? '+' : ''}
                      {trend.improvement.toFixed(2)} {trend.unit}
                    </span>
                    <p className={`text-xs ${
                      trend.trend === 'up' ? 'text-green-700' :
                      trend.trend === 'down' ? 'text-red-700' :
                      'text-gray-700'
                    }`}>
                      ({trend.improvementPercentage > 0 ? '+' : ''}
                      {trend.improvementPercentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              )}

              {/* Test Count */}
              <div className="pt-2 text-center text-xs text-gray-500">
                Number of tests: {trend.count} sessions
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTrends.length === 0 && (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No data found
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            No test results for the selected type.
          </p>
        </div>
      )}
    </div>
  );
}
