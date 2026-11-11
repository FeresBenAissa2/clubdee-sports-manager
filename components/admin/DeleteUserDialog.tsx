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
import { deleteUser } from '@/lib/admin/actions';
import { AlertTriangle } from 'lucide-react';

interface DeleteUserDialogProps {
  user: {
    id: string;
    name: string;
    type: 'athlete' | 'coach';
  };
  open: boolean;
  onClose: () => void;
}

export function DeleteUserDialog({ user, open, onClose }: DeleteUserDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    const result = await deleteUser(user.id, user.type);

    if (result.success) {
      onClose();
      router.refresh();
    } else {
      setError(result.error || 'Failed to delete user');
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete {user.type === 'coach' ? 'Coach' : 'Athlete'}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{user.name}</strong>? This action cannot be
            undone and will remove all associated data including attendance records and performance
            data.
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
            {loading ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
