'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getClubHomeTrainingLogs, reviewHomeTrainingLog } from '@/lib/coach/home-training-actions';
import { GiveFeedbackDialog } from '@/components/coach/GiveFeedbackDialog';
import { Video, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useToast } from '@/hooks/useToast';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  needs_improvement: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: 'PROCESSING',
  reviewed: 'Reviewed',
  approved: 'Approve',
  needs_improvement: 'Needs improvement',
};

export function CoachHomeTrainingList() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { toast } = useToast();

  async function loadLogs(status?: string) {
    setLoading(true);
    const { data, error } = await getClubHomeTrainingLogs(
      status && status !== 'all' ? { status } : undefined
    );
    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadLogs(filter);
  }, [filter]);

  async function handleQuickReview(logId: string, status: 'approved' | 'needs_improvement') {
    const { error } = await reviewHomeTrainingLog(logId, status);
    if (error) {
      toast({
        title: 'An error occurred',
        description: error,
        variant: 'error',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Status updated successfully',
      });
      loadLogs(filter);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">PROCESSING</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="approved">Approve</TabsTrigger>
          <TabsTrigger value="needs_improvement">Needs improvement</TabsTrigger>
        </TabsList>
      </Tabs>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No data
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{log.exercise_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {log.athlete?.full_name} • {format(new Date(log.training_date), 'dd MMMM yyyy', { locale: th })}
                    </p>
                  </div>
                  <Badge className={statusColors[log.status as keyof typeof statusColors]}>
                    {statusLabels[log.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">{log.training_type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">DistanceTime:</span>
                    <p className="font-medium">{log.duration_minutes} MINS</p>
                  </div>
                  {log.sets && (
                    <div>
                      <span className="text-muted-foreground">Zur&uuml;cksetzen:</span>
                      <p className="font-medium">{log.sets}</p>
                    </div>
                  )}
                  {log.reps && (
                    <div>
                      <span className="text-muted-foreground">sessions:</span>
                      <p className="font-medium">{log.reps}</p>
                    </div>
                  )}
                </div>

                {log.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Notes:</span>
                    <p className="text-sm mt-1">{log.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {log.video_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={log.video_url} target="_blank" rel="noopener noreferrer">
                        <Video className="h-4 w-4 mr-2" />
                        ViewsGoodO.
                      </a>
                    </Button>
                  )}

                  {log.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleQuickReview(log.id, 'approved')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleQuickReview(log.id, 'needs_improvement')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Needs improvement
                      </Button>
                    </>
                  )}

                  <GiveFeedbackDialog trainingLogId={log.id} onSuccess={() => loadLogs(filter)} />
                </div>

                {log.reviewed_at && (
                  <div className="text-xs text-muted-foreground">
                    Checked by {log.reviewer?.full_name} • {format(new Date(log.reviewed_at), 'dd MMM yyyy HH:mm', { locale: th })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
