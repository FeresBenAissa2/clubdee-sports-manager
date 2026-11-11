import { createClient } from '@/lib/db/server';
import { getAvailableClubs } from '@/lib/membership/queries';
import { LandingPage } from '@/components/landing/LandingPage';
import type { LandingSport } from '@/components/landing/sports';

interface OpenClub {
  name: string;
  sport_type: string | null;
  coach_count: number;
}

function toSports(clubs: OpenClub[]): LandingSport[] {
  const bySport = new Map<string, LandingSport>();
  for (const club of clubs) {
    const name = (club.sport_type || club.name).trim();
    const key = name.toLowerCase();
    const existing = bySport.get(key);
    if (existing) {
      existing.coaches = (existing.coaches ?? 0) + club.coach_count;
    } else {
      bySport.set(key, { name, coaches: club.coach_count });
    }
  }
  return [...bySport.values()];
}

/** Seasons start in August: Nov 2026 → "2026/27". */
function currentSeason(now = new Date()) {
  const start = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}

export default async function Home() {
  const db = await createClient();
  const [
    {
      data: { user },
    },
    clubs,
  ] = await Promise.all([db.auth.getUser(), getAvailableClubs()]);

  return (
    <LandingPage
      signedIn={Boolean(user)}
      sports={toSports((clubs.data ?? []) as OpenClub[])}
      season={currentSeason()}
    />
  );
}
