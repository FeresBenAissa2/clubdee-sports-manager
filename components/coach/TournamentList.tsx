'use client';

import { useEffect, useState } from 'react';
import { getCoachTournaments } from '@/lib/coach/tournament-actions';
import { TournamentCard } from './TournamentCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function TournamentList() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    setLoading(true);
    const result = await getCoachTournaments();
    if (result.tournaments) {
      setTournaments(result.tournaments);
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const upcoming = tournaments.filter(t => t.status === 'upcoming');
  const ongoing = tournaments.filter(t => t.status === 'ongoing');
  const completed = tournaments.filter(t => t.status === 'completed');

  return (
    <Tabs defaultValue="upcoming" className="w-full">
      <TabsList>
        <TabsTrigger value="upcoming">
          Upcoming ({upcoming.length})
        </TabsTrigger>
        <TabsTrigger value="ongoing">
          In progress ({ongoing.length})
        </TabsTrigger>
        <TabsTrigger value="completed">
          Completed ({completed.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming" className="space-y-4 mt-6">
        {upcoming.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No upcoming tournaments
          </p>
        ) : (
          upcoming.map(tournament => (
            <TournamentCard key={tournament.id} tournament={tournament} onUpdate={loadTournaments} />
          ))
        )}
      </TabsContent>

      <TabsContent value="ongoing" className="space-y-4 mt-6">
        {ongoing.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No in-progress tournaments
          </p>
        ) : (
          ongoing.map(tournament => (
            <TournamentCard key={tournament.id} tournament={tournament} onUpdate={loadTournaments} />
          ))
        )}
      </TabsContent>

      <TabsContent value="completed" className="space-y-4 mt-6">
        {completed.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No completed tournaments
          </p>
        ) : (
          completed.map(tournament => (
            <TournamentCard key={tournament.id} tournament={tournament} onUpdate={loadTournaments} />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
