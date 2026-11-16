import { Suspense } from 'react';
import Link from 'next/link';
import { TournamentList } from '@/components/coach/TournamentList';
import { CreateTournamentDialog } from '@/components/coach/CreateTournamentDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/db/server';
import { getCoachAccess } from '@/lib/coach/session-access';

export default async function TournamentsPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  const access = user ? await getCoachAccess(db, user.id) : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Link href="/dashboard/coach">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </Link>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tournaments</h1>
          <p className="text-muted-foreground mt-1">
            Manage tournaments and select athletes to register
          </p>
        </div>
        <CreateTournamentDialog clubs={access?.clubs ?? []} />
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <TournamentList />
      </Suspense>
    </div>
  );
}
