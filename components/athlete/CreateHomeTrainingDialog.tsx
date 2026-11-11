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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createHomeTrainingLog, uploadHomeTrainingVideo } from '@/lib/athlete/home-training-actions';
import { useToast } from '@/hooks/useToast';
import { Plus, Upload, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const trainingTypes = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Endurance' },
  { value: 'skill_practice', label: 'Skill practice' },
  { value: 'flexibility', label: 'Flexibility' },
];

export function CreateHomeTrainingDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    training_date: new Date().toISOString().split('T')[0],
    training_type: '',
    duration_minutes: '',
    exercise_name: '',
    sets: '',
    reps: '',
    notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      let videoUrl = '';
      
      // Upload video if selected
      if (videoFile) {
        setUploading(true);
        const { data: uploadData, error: uploadError } = await uploadHomeTrainingVideo(videoFile);
        setUploading(false);
        
        if (uploadError) {
          toast({
            title: 'An error occurred',
            description: uploadError,
            variant: 'error',
          });
          setLoading(false);
          return;
        }
        
        videoUrl = uploadData?.url || '';
      }

      const { data, error } = await createHomeTrainingLog({
        training_date: formData.training_date,
        training_type: formData.training_type,
        duration_minutes: parseInt(formData.duration_minutes),
        exercise_name: formData.exercise_name,
        sets: formData.sets ? parseInt(formData.sets) : undefined,
        reps: formData.reps ? parseInt(formData.reps) : undefined,
        notes: formData.notes || undefined,
        video_url: videoUrl || undefined,
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
          description: 'Training logged successfully',
        });
        setOpen(false);
        setFormData({
          training_date: new Date().toISOString().split('T')[0],
          training_type: '',
          duration_minutes: '',
          exercise_name: '',
          sets: '',
          reps: '',
          notes: '',
        });
        setVideoFile(null);
        router.refresh();
      }
    } catch (err) {
      toast({
        title: 'An error occurred',
        description: 'Could not save data',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Training log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log home training</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="training_date">Training date</Label>
              <Input
                id="training_date"
                type="date"
                value={formData.training_date}
                onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="training_type">Training type</Label>
              <Select
                value={formData.training_type}
                onValueChange={(value) => setFormData({ ...formData, training_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {trainingTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exercise_name">Exercise name</Label>
            <Input
              id="exercise_name"
              value={formData.exercise_name}
              onChange={(e) => setFormData({ ...formData, exercise_name: e.target.value })}
              placeholder="Such as Running, Push-ups, Stretching"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                type="number"
                min="1"
                max="480"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sets">Number of sets</Label>
              <Input
                id="sets"
                type="number"
                min="1"
                value={formData.sets}
                onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
                placeholder="If any"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reps">Times</Label>
              <Input
                id="reps"
                type="number"
                min="1"
                value={formData.reps}
                onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                placeholder="If any"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">Training video (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
              {videoFile && (
                <span className="text-sm text-muted-foreground">
                  {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Supports MP4, MOV, AVI, WebM (No more than 100MB)
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading video...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
