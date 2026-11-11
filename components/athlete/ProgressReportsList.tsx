'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, TrendingUp, Calendar, Award } from 'lucide-react';
import ProgressReportDetail from './ProgressReportDetail';

interface ProgressReport {
  id: string;
  title: string;
  report_type: string;
  period_start: string;
  period_end: string;
  summary: string | null;
  metrics: any;
  published_at: string;
  coaches: {
    first_name: string;
    last_name: string;
  };
}

interface ProgressReportsListProps {
  reports: ProgressReport[];
}

export default function ProgressReportsList({ reports }: ProgressReportsListProps) {
  const [selectedReport, setSelectedReport] = useState<ProgressReport | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      custom: 'Custom',
    };
    return labels[type] || type;
  };

  const getReportTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      weekly: 'bg-blue-100 text-blue-800',
      monthly: 'bg-green-100 text-green-800',
      quarterly: 'bg-purple-100 text-purple-800',
      yearly: 'bg-orange-100 text-orange-800',
      custom: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors.custom;
  };

  if (selectedReport) {
    return (
      <div>
        <Button
          variant="outline"
          onClick={() => setSelectedReport(null)}
          className="mb-4"
        >
          ← Back to reports list
        </Button>
        <ProgressReportDetail reportId={selectedReport.id} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {reports.map((report) => (
        <Card key={report.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription className="mt-1">
                  By Coach {report.coaches.first_name} {report.coaches.last_name}
                </CardDescription>
              </div>
              <Badge className={getReportTypeColor(report.report_type)}>
                {getReportTypeLabel(report.report_type)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Period */}
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              <span>
                {formatDate(report.period_start)} - {formatDate(report.period_end)}
              </span>
            </div>

            {/* Key Metrics */}
            {report.metrics && (
              <div className="grid grid-cols-2 gap-3">
                {report.metrics.attendance && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Training attendance rate</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {report.metrics.attendance.attendance_rate?.toFixed(1)}%
                    </div>
                  </div>
                )}
                {report.metrics.goals && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">GoalsSuccess</div>
                    <div className="text-2xl font-bold text-green-600">
                      {report.metrics.goals.completed_count || 0}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {report.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {report.summary}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setSelectedReport(report)}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                View reports
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  // TODO: Implement PDF download
                  alert('Download PDF feature coming soon');
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
