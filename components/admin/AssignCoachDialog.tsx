'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { assignCoachToClub } from '@/lib/admin/actions';

interface Coach {
  id: string;
  first_name: string;
  last_name: string;
  clubs?: {
    id: string;
    name: string;
  } | null;
}

interface Club {
  id: string;
  name: string;
  sport_type: string;
}

interface AssignCoachDialogProps {
  coach: Coach;
  clubs: Club[];
  open: boolean;
  onClose: () => void;
}

export function AssignCoachDialog({ coach, clubs, open, onClose }: AssignCoachDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string>(coach.clubs?.id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClubId) {
      setError('Please select a club');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await assignCoachToClub(coach.id, selectedClubId);

    if (result.success) {
      onClose();
      router.refresh();
    } else {
      setError(result.error || 'Failed to assign coach');
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Coach to Club</DialogTitle>
          <DialogDescription>
            Assign {coach.first_name} {coach.last_name} to a club
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="club">Select Club</Label>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a club" />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name} ({club.sport_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Coach'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
