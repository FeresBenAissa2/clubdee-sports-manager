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
import { deleteClub } from '@/lib/admin/actions';
import { AlertTriangle } from 'lucide-react';

interface Club {
  id: string;
  name: string;
}

interface DeleteClubDialogProps {
  club: Club;
  open: boolean;
  onClose: () => void;
}

export function DeleteClubDialog({ club, open, onClose }: DeleteClubDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    const result = await deleteClub(club.id);

    if (result.success) {
      onClose();
      router.refresh();
    } else {
      setError(result.error || 'Failed to delete club');
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete Club
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{club.name}</strong>? This action cannot be
            undone and will affect all associated athletes and coaches.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete Club'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
