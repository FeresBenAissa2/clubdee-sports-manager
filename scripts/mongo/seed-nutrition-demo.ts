/**
 * Adds training sessions to the demo athlete's club so the nutrition fuel plan has
 * something to plan around (today and tomorrow, in club time).
 *
 *   npm run db:seed:nutrition-demo                  today 17:30–19:00, tomorrow 06:30–07:30
 *   npm run db:seed:nutrition-demo -- --at 16:00    today's session starts at 16:00
 *   npm run db:seed:nutrition-demo -- --clear       remove the demo sessions (rest day view)
 *
 * Safe to run again: it replaces the sessions it created before (marked "Nutrition demo").
 */
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { getMongoClient, mongoConfig } from '../../lib/db/mongo';
import { addDays, dayKey } from '../../lib/nutrition/dates';
import { toClock, toMinutes } from '../../lib/nutrition/plan';

config({ path: '.env.local', quiet: true });

const MARK = 'Nutrition demo';
const DEMO_CLUB = '00000000-0000-0000-0000-000000000003';

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const client = await getMongoClient();
  const db = client.db(mongoConfig().dbName);

  const athlete = await db.collection('athletes').findOne({ email: 'demo.athlete@clubdee.com' });
  const clubId: string = athlete?.club_id ?? DEMO_CLUB;
  const coach = await db.collection('coaches').findOne({ club_id: clubId });
  const coachId: string | null = coach?.user_id ?? null;

  const today = dayKey();
  const tomorrow = addDays(today, 1);
  const sessions = db.collection('training_sessions');
  const removed = await sessions.deleteMany({ club_id: clubId, description: MARK });

  if (process.argv.includes('--clear')) {
    console.log(
      `Removed ${removed.deletedCount} demo session(s). Today is now a rest day for club ${clubId}.`
    );
    return;
  }

  const at = argValue('--at') ?? '17:30';
  if (!/^\d{1,2}:\d{2}$/.test(at)) throw new Error('--at expects HH:MM, e.g. --at 16:00');
  const start = toMinutes(at);
  const now = new Date();
  const make = (date: string, title: string, from: number, to: number, location: string) => ({
    id: randomUUID(),
    club_id: clubId,
    coach_id: coachId,
    created_by: coachId,
    title,
    description: MARK,
    session_date: date,
    start_time: `${toClock(from)}:00`,
    end_time: `${toClock(to)}:00`,
    location,
    status: 'scheduled',
    created_at: now,
    updated_at: now,
  });

  await sessions.insertMany([
    make(today, 'Swim technique', start, start + 90, 'Pool A'),
    make(tomorrow, 'Early endurance swim', 6 * 60 + 30, 7 * 60 + 30, 'Pool A'),
  ]);
  console.log(
    `Club ${clubId}: today ${today} at ${toClock(start)}, tomorrow ${tomorrow} at 06:30.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
