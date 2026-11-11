'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getMyHomeTrainingLogs, deleteHomeTrainingLog } from '@/lib/athlete/home-training-actions';
import { HomeTrainingLog } from '@/lib/athlete/home-training-actions';
import { Trash2, Video, MessageSquare } from 'lucide-react';
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
  pending: 'Awaiting review',
  reviewed: 'Verified',
  approved: 'Approve',
  needs_improvement: 'Needs improvement',
};

export function HomeTrainingList() {
  const [logs, setLogs] = useState<HomeTrainingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function loadLogs() {
    const { data, error } = await getMyHomeTrainingLogs();
    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this record??')) return;

    const { error } = await deleteHomeTrainingLog(id);
    if (error) {
      toast({
        title: 'An error occurred',
        description: error,
        variant: 'error',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Record deleted successfully',
      });
      loadLogs();
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No home training logged yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{log.exercise_name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(log.training_date), 'dd MMMM yyyy', { locale: th })}
                </p>
              </div>
              <Badge className={statusColors[log.status]}>
                {statusLabels[log.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium">{log.training_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <p className="font-medium">{log.duration_minutes} min</p>
              </div>
              {log.sets && (
                <div>
                  <span className="text-muted-foreground">Sets:</span>
                  <p className="font-medium">{log.sets}</p>
                </div>
              )}
              {log.reps && (
                <div>
                  <span className="text-muted-foreground">times:</span>
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

            <div className="flex gap-2">
              {log.video_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={log.video_url} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4 mr-2" />
                    Watch video
                  </a>
                </Button>
              )}
              
              {log.status !== 'pending' && (
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View Feedback
                </Button>
              )}

              {log.status === 'pending' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(log.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
