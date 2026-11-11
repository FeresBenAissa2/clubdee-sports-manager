'use client';

import { useState } from 'react';
import {
  updateNotificationPreferences,
  type ParentConnection,
  type NotificationPreferences,
} from '@/lib/parent/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface NotificationPreferencesDialogProps {
  connection: ParentConnection;
  onUpdate: () => void;
}

export function NotificationPreferencesDialog({
  connection,
  onUpdate,
}: NotificationPreferencesDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notify_attendance: connection.notify_attendance,
    notify_performance: connection.notify_performance,
    notify_leave_requests: connection.notify_leave_requests,
    notify_announcements: connection.notify_announcements,
    notify_goals: connection.notify_goals,
    notification_frequency: connection.notification_frequency,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await updateNotificationPreferences(connection.id, preferences);
      
      if (result.success) {
        toast({
          title: 'Updated successfully',
          description: result.message,
        });
        setOpen(false);
        onUpdate();
      } else {
        toast({
          title: 'An error occurred',
          description: result.error,
          variant: 'error',
        });
      }
    } catch (error) {
      toast({
        title: 'An error occurred',
        description: 'Could not update settings',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Notification settings</DialogTitle>
            <DialogDescription>
              Choose what parents are notified about and how often.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Notification types</h4>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="notify_attendance" className="flex flex-col gap-1">
                  <span>Training attendance</span>
                  <span className="text-xs text-gray-500 font-normal">
                    Notify when the athlete attends or misses training
                  </span>
                </Label>
                <Switch
                  id="notify_attendance"
                  checked={preferences.notify_attendance}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notify_attendance: checked })
                  }
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify_performance" className="flex flex-col gap-1">
                  <span>Test results</span>
                  <span className="text-xs text-gray-500 font-normal">
                    Notify when new test results are posted
                  </span>
                </Label>
                <Switch
                  id="notify_performance"
                  checked={preferences.notify_performance}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notify_performance: checked })
                  }
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify_leave_requests" className="flex flex-col gap-1">
                  <span>Leave</span>
                  <span className="text-xs text-gray-500 font-normal">
                    Notify when a leave request is submitted or approved
                  </span>
                </Label>
                <Switch
                  id="notify_leave_requests"
                  checked={preferences.notify_leave_requests}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notify_leave_requests: checked })
                  }
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify_announcements" className="flex flex-col gap-1">
                  <span>Announcement</span>
                  <span className="text-xs text-gray-500 font-normal">
                    Notify for important announcements
                  </span>
                </Label>
                <Switch
                  id="notify_announcements"
                  checked={preferences.notify_announcements}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notify_announcements: checked })
                  }
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify_goals" className="flex flex-col gap-1">
                  <span>Goals</span>
                  <span className="text-xs text-gray-500 font-normal">
                    Notify when a new goal is set or achieved
                  </span>
                </Label>
                <Switch
                  id="notify_goals"
                  checked={preferences.notify_goals}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notify_goals: checked })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification_frequency">Notification frequency</Label>
              <Select
                value={preferences.notification_frequency}
                onValueChange={(value: 'immediate' | 'daily' | 'weekly') =>
                  setPreferences({ ...preferences, notification_frequency: value })
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediately</SelectItem>
                  <SelectItem value="daily">Daily (Daily summary)</SelectItem>
                  <SelectItem value="weekly">Weekly (Weekly summary)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {preferences.notification_frequency === 'immediate' && 
                  'Receive instant notifications when events occur'}
                {preferences.notification_frequency === 'daily' && 
                  'Receive a daily notification summary at 18:00 Wed.'}
                {preferences.notification_frequency === 'weekly' && 
                  'Receive a notification summary every Sunday at 18:00 Wed.'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
