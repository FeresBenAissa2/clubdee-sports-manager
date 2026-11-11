import { Suspense } from 'react';
import { TournamentManagement } from '@/components/coach/TournamentManagement';

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  return (
    <div className="container mx-auto p-6">
      <Suspense fallback={<div>Loading...</div>}>
        <TournamentManagement tournamentId={id} />
      </Suspense>
    </div>
  );
}
