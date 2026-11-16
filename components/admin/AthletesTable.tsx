'use client';

import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Search, Trash2 } from 'lucide-react';
import { DeleteUserDialog } from './DeleteUserDialog';

interface Athlete {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  clubs?: {
    id: string;
    name: string;
    sport_type: string;
  } | null;
}

function ageOf(dateOfBirth: string | null): string {
  if (!dateOfBirth) return '-';
  const born = new Date(dateOfBirth);
  if (Number.isNaN(born.getTime())) return '-';
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const hadBirthday =
    now.getMonth() > born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate());
  if (!hadBirthday) age -= 1;
  return age >= 0 ? String(age) : '-';
}

export function AthletesTable({ athletes }: { athletes: Athlete[] }) {
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<Athlete | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter((a) =>
      [a.first_name, a.last_name, a.email, a.clubs?.name, a.clubs?.sport_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [athletes, query]);

  return (
    <>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or club"
          aria-label="Search athletes"
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Club</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                  No athlete matches your search
                </TableCell>
              </TableRow>
            )}
            {visible.map((athlete) => (
              <TableRow key={athlete.id}>
                <TableCell className="font-medium">
                  {athlete.first_name} {athlete.last_name}
                </TableCell>
                <TableCell>{athlete.email || '-'}</TableCell>
                <TableCell>{athlete.phone_number || '-'}</TableCell>
                <TableCell>{ageOf(athlete.date_of_birth)}</TableCell>
                <TableCell>
                  {athlete.clubs ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                      <Building2 className="h-3 w-3" />
                      {athlete.clubs.name}
                    </span>
                  ) : (
                    <span className="text-gray-400">No club</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Delete ${athlete.first_name} ${athlete.last_name}`}
                    onClick={() => setDeleting(athlete)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {deleting && (
        <DeleteUserDialog
          user={{
            id: deleting.user_id,
            name: `${deleting.first_name} ${deleting.last_name}`,
            type: 'athlete',
          }}
          open={!!deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
