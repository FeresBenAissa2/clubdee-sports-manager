'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { EditClubDialog } from './EditClubDialog';
import { DeleteClubDialog } from './DeleteClubDialog';

interface Club {
  id: string;
  name: string;
  sport_type: string;
  description: string | null;
  created_at: string;
}

interface ClubsTableProps {
  clubs: Club[];
}

export function ClubsTable({ clubs }: ClubsTableProps) {
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [deletingClub, setDeletingClub] = useState<Club | null>(null);

  return (
    <>
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Sport Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clubs.map((club) => (
              <TableRow key={club.id}>
                <TableCell className="font-medium">{club.name}</TableCell>
                <TableCell>{club.sport_type}</TableCell>
                <TableCell className="max-w-md truncate">
                  {club.description || '-'}
                </TableCell>
                <TableCell>{new Date(club.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingClub(club)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingClub(club)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingClub && (
        <EditClubDialog
          key={editingClub.id}
          club={editingClub}
          open={!!editingClub}
          onClose={() => setEditingClub(null)}
        />
      )}

      {deletingClub && (
        <DeleteClubDialog
          club={deletingClub}
          open={!!deletingClub}
          onClose={() => setDeletingClub(null)}
        />
      )}
    </>
  );
}
