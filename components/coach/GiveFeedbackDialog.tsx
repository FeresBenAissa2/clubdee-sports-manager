'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createHomeTrainingFeedback } from '@/lib/coach/home-training-actions';
import { useToast } from '@/hooks/useToast';
import { MessageSquare, Loader2, Star } from 'lucide-react';

interface GiveFeedbackDialogProps {
  trainingLogId: string;
  onSuccess?: () => void;
}

export function GiveFeedbackDialog({ trainingLogId, onSuccess }: GiveFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    feedback_text: '',
    rating: '',
    next_steps: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await createHomeTrainingFeedback({
      training_log_id: trainingLogId,
      feedback_text: formData.feedback_text,
      rating: formData.rating ? parseInt(formData.rating) : undefined,
      next_steps: formData.next_steps || undefined,
    });

    if (error) {
      toast({
        title: 'An error occurred',
        description: error,
        variant: 'error',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Feedback sent successfully',
      });
      setOpen(false);
      setFormData({
        feedback_text: '',
        rating: '',
        next_steps: '',
      });
      onSuccess?.();
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <MessageSquare className="h-4 w-4 mr-2" />
          Give feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Give training feedback</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rating">Score</Label>
            <Select
              value={formData.rating}
              onValueChange={(value) => setFormData({ ...formData, rating: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rating (1–5 stars)" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: num }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback_text">Feedback</Label>
            <Textarea
              id="feedback_text"
              value={formData.feedback_text}
              onChange={(e) => setFormData({ ...formData, feedback_text: e.target.value })}
              placeholder="Share comments about the training..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_steps">Recommendations for next time</Label>
            <Textarea
              id="next_steps"
              value={formData.next_steps}
              onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
              placeholder="Recommend what to improve or do next..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send feedback'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
