'use client';

import { useState } from 'react';
import { createTournament } from '@/lib/coach/tournament-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreateTournamentDialog({ clubs = [] }: { clubs?: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clubId, setClubId] = useState(clubs[0]?.id ?? '');
  const [formData, setFormData] = useState({
    name: '',
    sport_type: '',
    location: '',
    notes: '',
    max_participants: '',
    start_date: '',
    end_date: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (formData.end_date < formData.start_date) {
      setError('End date must be on or after the start date');
      return;
    }
    setLoading(true);

    const result = await createTournament({
      club_id: clubId || undefined,
      name: formData.name,
      sport_type: formData.sport_type,
      location: formData.location || undefined,
      notes: formData.notes || undefined,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined,
      start_date: formData.start_date,
      end_date: formData.end_date,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
      // The list loads its own data; tell it to reload.
      window.dispatchEvent(new Event('tournaments:changed'));
      setFormData({
        name: '',
        sport_type: '',
        location: '',
        notes: '',
        max_participants: '',
        start_date: '',
        end_date: '',
      });
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create tournament
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create new tournament</DialogTitle>
          <DialogDescription>
            Enter the tournament details. You can select athletes once it is created.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {clubs.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="tournament-club">Club *</Label>
              <select
                id="tournament-club"
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                disabled={loading}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Athletes are selected from this club.</p>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Tournament name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Youth football tournament 2024"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sport_type">Sport type *</Label>
            <Input
              id="sport_type"
              value={formData.sport_type}
              onChange={(e) => setFormData({ ...formData, sport_type: e.target.value })}
              required
              placeholder="e.g. football, basketball"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
                min={formData.start_date}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. main stadium"
            />
          </div>

          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create tournament'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
