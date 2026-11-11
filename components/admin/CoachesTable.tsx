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
import { Building2, Trash2 } from 'lucide-react';
import { AssignCoachDialog } from './AssignCoachDialog';
import { DeleteUserDialog } from './DeleteUserDialog';

interface Coach {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  clubs?: {
    id: string;
    name: string;
    sport_type: string;
  } | null;
}

interface Club {
  id: string;
  name: string;
  sport_type: string;
}

interface CoachesTableProps {
  coaches: Coach[];
  clubs: Club[];
}

export function CoachesTable({ coaches, clubs }: CoachesTableProps) {
  const [assigningCoach, setAssigningCoach] = useState<Coach | null>(null);
  const [deletingCoach, setDeletingCoach] = useState<Coach | null>(null);

  return (
    <>
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Club</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coaches.map((coach) => (
              <TableRow key={coach.id}>
                <TableCell className="font-medium">
                  {coach.first_name} {coach.last_name}
                </TableCell>
                <TableCell>{coach.email}</TableCell>
                <TableCell>{coach.phone_number}</TableCell>
                <TableCell>
                  {coach.clubs ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                      <Building2 className="h-3 w-3" />
                      {coach.clubs.name}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not assigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssigningCoach(coach)}
                    >
                      <Building2 className="mr-1 h-4 w-4" />
                      Assign
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingCoach(coach)}
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

      {assigningCoach && (
        <AssignCoachDialog
          coach={assigningCoach}
          clubs={clubs}
          open={!!assigningCoach}
          onClose={() => setAssigningCoach(null)}
        />
      )}

      {deletingCoach && (
        <DeleteUserDialog
          user={{
            id: deletingCoach.user_id,
            name: `${deletingCoach.first_name} ${deletingCoach.last_name}`,
            type: 'coach',
          }}
          open={!!deletingCoach}
          onClose={() => setDeletingCoach(null)}
        />
      )}
    </>
  );
}
