'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { cancelSession, updateSession } from '@/lib/coach/session-actions';
import { localDateKey } from '@/lib/utils/local-date';

interface SessionManageButtonsProps {
  session: {
    id: string;
    title: string;
    description?: string | null;
    session_date: string;
    start_time: string;
    end_time: string;
    location: string;
  };
}

const hhmm = (time: string) => time.slice(0, 5);

/** Edit and cancel controls for a training session that has not started yet. */
export function SessionManageButtons({ session }: SessionManageButtonsProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: session.title,
    description: session.description ?? '',
    session_date: session.session_date,
    start_time: hhmm(session.start_time),
    end_time: hhmm(session.end_time),
    location: session.location,
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [field]: e.target.value }));
    setError(null);
  };

  const openEdit = () => {
    setForm({
      title: session.title,
      description: session.description ?? '',
      session_date: session.session_date,
      start_time: hhmm(session.start_time),
      end_time: hhmm(session.end_time),
      location: session.location,
    });
    setError(null);
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.start_time >= form.end_time) {
      setError('End time must be after start time');
      return;
    }
    setSaving(true);
    const result = await updateSession(session.id, form);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
    addToast({ title: 'Session updated', description: 'Your changes were saved', variant: 'success' });
    router.refresh();
  };

  const confirmCancel = async () => {
    setSaving(true);
    const result = await cancelSession(session.id);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setCancelling(false);
    addToast({ title: 'Session cancelled', description: `${session.title} was removed from the schedule`, variant: 'success' });
    router.push('/dashboard/coach/sessions');
    router.refresh();
  };

  return (
    <>
      <Button type="button" variant="outline" size="lg" onClick={openEdit}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="lg"
        onClick={() => {
          setError(null);
          setCancelling(true);
        }}
      >
        <XCircle className="mr-2 h-4 w-4" />
        Cancel session
      </Button>

      <Dialog open={editing} onOpenChange={(open) => !saving && setEditing(open)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit training session</DialogTitle>
            <DialogDescription>Athletes see the updated details right away.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Session name</Label>
              <Input id="edit-title" value={form.title} onChange={set('title')} required minLength={3} maxLength={200} disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Details</Label>
              <Textarea id="edit-description" value={form.description} onChange={set('description')} rows={3} maxLength={1000} disabled={saving} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input id="edit-date" type="date" value={form.session_date} min={localDateKey()} onChange={set('session_date')} required disabled={saving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-start">Start</Label>
                <Input id="edit-start" type="time" value={form.start_time} onChange={set('start_time')} required disabled={saving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">End</Label>
                <Input id="edit-end" type="time" value={form.end_time} onChange={set('end_time')} required disabled={saving} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input id="edit-location" value={form.location} onChange={set('location')} required minLength={2} maxLength={200} disabled={saving} />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Close
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelling} onOpenChange={(open) => !saving && setCancelling(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this training session?</DialogTitle>
            <DialogDescription>
              <strong>{session.title}</strong> will be removed from the schedule of every athlete. Sessions can be
              cancelled until 2 hours before they start. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelling(false)} disabled={saving}>
              Keep session
            </Button>
            <Button type="button" variant="destructive" onClick={confirmCancel} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, cancel it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
