'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createActivity } from '@/lib/activity/actions';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function CreateActivityDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activity_type: 'training' as 'training' | 'competition' | 'practice' | 'other',
    activity_date: '',
    start_time: '',
    end_time: '',
    location: '',
    max_participants: '',
    requires_registration: false,
    checkin_window_before: '30',
    checkin_window_after: '15',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await createActivity({
      ...formData,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined,
      checkin_window_before: parseInt(formData.checkin_window_before),
      checkin_window_after: parseInt(formData.checkin_window_after),
    });

    setLoading(false);

    if (result.error) {
      addToast({
        title: 'An error occurred',
        description: result.error,
        variant: 'error',
      });
    } else {
      addToast({
        title: 'Create Success Event',
        description: 'Event has been successfully created.',
        variant: 'success',
      });
      setOpen(false);
      setFormData({
        title: '',
        description: '',
        activity_type: 'training',
        activity_date: '',
        start_time: '',
        end_time: '',
        location: '',
        max_participants: '',
        requires_registration: false,
        checkin_window_before: '30',
        checkin_window_after: '15',
      });
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create an eventNew</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Event name *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="activity_type">TypeEvent *</Label>
            <Select
              value={formData.activity_type}
              onValueChange={(value: any) => setFormData({ ...formData, activity_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="competition">Race</SelectItem>
                <SelectItem value="practice">test</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="activity_date">Date *</Label>
              <Input
                id="activity_date"
                type="date"
                value={formData.activity_date}
                onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="start_time">Start time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time">End time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="requires_registration"
              checked={formData.requires_registration}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, requires_registration: checked as boolean })
              }
            />
            <Label htmlFor="requires_registration" className="cursor-pointer">
              toRegisterBeforehand (CoachtoApprovePrevPresent)
            </Label>
          </div>

          {formData.requires_registration && (
            <div>
              <Label htmlFor="max_participants">Maximum participants</Label>
              <Input
                id="max_participants"
                type="number"
                min="1"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">RangeTimeCheck-In</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkin_window_before">You can check in before the start. (MINS)</Label>
                <Input
                  id="checkin_window_before"
                  type="number"
                  min="0"
                  value={formData.checkin_window_before}
                  onChange={(e) => setFormData({ ...formData, checkin_window_before: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="checkin_window_after">You can check in after the start of the (MINS)</Label>
                <Input
                  id="checkin_window_after"
                  type="number"
                  min="0"
                  value={formData.checkin_window_after}
                  onChange={(e) => setFormData({ ...formData, checkin_window_after: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create an event'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
