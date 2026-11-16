/**
 * Demo data for the nutrition section, for the demo athlete's club (club time):
 * - training sessions today and tomorrow, so the fuel plan has something to plan around;
 * - with --history, about four months of sessions, ticked plan steps, meals, water and
 *   weekly check-ins, so the athlete's "Past days" and the coach's athlete page have content.
 *
 *   npm run db:seed:nutrition-demo                          today 17:30–19:00, tomorrow 06:30
 *   npm run db:seed:nutrition-demo -- --at 16:00            today's session starts at 16:00
 *   npm run db:seed:nutrition-demo -- --history             also add ~4 months of history
 *   npm run db:seed:nutrition-demo -- --clear               remove everything this script added
 *
 * Safe to run again: it first removes what it created before. Sessions are marked
 * "Nutrition demo"; nutrition rows carry `seed: "nutrition-demo"`. Water and check-ins
 * the athlete logged themselves are never overwritten.
 */
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import type { Db } from 'mongodb';
import { getMongoClient, mongoConfig } from '../../lib/db/mongo';
import { addDays, dayKey, weekStart } from '../../lib/nutrition/dates';
import { NUTRITION_COLLECTIONS as C } from '../../lib/nutrition/indexes';
import { buildFuelPlan, toClock, toMinutes, type PlanSession } from '../../lib/nutrition/plan';
import { hydrationGoal } from '../../lib/nutrition/tips';

config({ path: '.env.local', quiet: true });

const MARK = 'Nutrition demo';
const SEED = 'nutrition-demo';
const DEMO_CLUB = '00000000-0000-0000-0000-000000000003';

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

interface Athlete {
  id: string;
  user_id: string;
  club_id: string;
}

/** How many past days --history fills (about four months). */
const HISTORY_DAYS = 120;

type PastDay = [ago: number, start: number | null, share: number, glasses: number];

/** The last six days, hand-written so the recent story is easy to present. */
const RECENT: PastDay[] = [
  [1, 17 * 60 + 30, 0.85, 9],
  [2, null, 0.75, 7],
  [3, 17 * 60 + 30, 0.5, 6],
  [4, null, 0.25, 4],
  [5, 6 * 60 + 30, 1, 10],
  [6, null, 0.5, 8],
];

/**
 * Older days follow the club's usual week (Mon/Wed 17:30, Fri 06:30) with a believable
 * story: logging was patchy three to four months ago, dipped during an exam month,
 * then got steadier. Deterministic, so every run gives the same demo.
 */
function olderDays(today: string): PastDay[] {
  const days: PastDay[] = [];
  for (let ago = RECENT.length + 1; ago <= HISTORY_DAYS; ago++) {
    const weekday = new Date(`${addDays(today, -ago)}T00:00:00Z`).getUTCDay(); // 0 = Sunday
    const start =
      weekday === 1 || weekday === 3 ? 17 * 60 + 30 : weekday === 5 ? 6 * 60 + 30 : null;
    const noise = (ago * 37) % 11; // 0–10
    const skipped = ago > 90 ? noise < 5 : ago > 45 && ago <= 70 ? noise < 4 : noise < 2;
    if (skipped) {
      days.push([ago, start, 0, 0]);
      continue;
    }
    const base = ago > 90 ? 0.35 : ago > 45 && ago <= 70 ? 0.45 : 0.7;
    const share = Math.min(1, base + (noise - 5) / 20);
    const glasses = Math.max(
      2,
      Math.round((start === null ? 8 : 10) * (base + 0.15 + (noise - 5) / 25))
    );
    days.push([ago, start, share, glasses]);
  }
  return days;
}

/** Weekly check-ins, newest first, for the weeks before this one (energy, sleep, appetite, legs). */
const CHECKINS: [number, number, number, number, string][] = [
  [4, 4, 5, 4, ''],
  [2, 3, 2, 2, 'Slept badly, legs heavy'],
  [3, 3, 4, 3, 'Exams this week'],
  [4, 4, 4, 3, ''],
  [4, 4, 4, 4, ''],
  [3, 4, 3, 3, ''],
  [2, 2, 3, 2, 'Exam month, very tired'],
  [3, 2, 3, 3, ''],
  [3, 3, 3, 3, ''],
  [4, 3, 4, 3, ''],
  [3, 3, 4, 3, ''],
  [3, 4, 3, 4, 'First weeks back after summer'],
  [3, 3, 3, 3, ''],
  [4, 4, 3, 3, ''],
  [3, 3, 3, 2, ''],
  [3, 4, 4, 3, ''],
];

async function seedHistory(db: Db, athlete: Athlete, makeSession: MakeSession) {
  const today = dayKey();
  const now = new Date();
  const sessions = db.collection('training_sessions');

  for (const [ago, start, share, glasses] of [...RECENT, ...olderDays(today)]) {
    const date = addDays(today, -ago);
    const daySessions: PlanSession[] = [];
    if (start !== null) {
      const early = start < 9 * 60;
      const doc = makeSession(
        date,
        early ? 'Early endurance swim' : 'Swim technique',
        start,
        start + (early ? 60 : 90)
      );
      await sessions.insertOne(doc);
      daySessions.push(doc);
    }

    const steps = buildFuelPlan(daySessions);
    const ticked = steps.slice(0, Math.round(steps.length * share));
    for (const step of ticked) {
      let mealId: string | null = null;
      if (step.mealType) {
        mealId = randomUUID();
        await db.collection(C.meals).insertOne({
          id: mealId,
          athlete_id: athlete.id,
          user_id: athlete.user_id,
          club_id: athlete.club_id,
          date,
          meal_type: step.mealType,
          items: step.foods.slice(0, 2),
          note: '',
          plan_step: step.id,
          seed: SEED,
          created_at: now,
        });
      }
      await db.collection(C.planChecks).insertOne({
        id: randomUUID(),
        athlete_id: athlete.id,
        user_id: athlete.user_id,
        club_id: athlete.club_id,
        date,
        step_id: step.id,
        meal_id: mealId,
        seed: SEED,
        created_at: now,
      });
    }

    if (glasses === 0) continue; // a day with nothing logged
    await db.collection(C.hydration).updateOne(
      { athlete_id: athlete.id, date },
      {
        $setOnInsert: {
          id: randomUUID(),
          user_id: athlete.user_id,
          club_id: athlete.club_id,
          glasses,
          goal: hydrationGoal(daySessions.length),
          seed: SEED,
          updated_at: now,
        },
      },
      { upsert: true }
    );
  }

  // A snack that is not part of the plan, two days ago.
  await db.collection(C.meals).insertOne({
    id: randomUUID(),
    athlete_id: athlete.id,
    user_id: athlete.user_id,
    club_id: athlete.club_id,
    date: addDays(today, -2),
    meal_type: 'snack',
    items: ['fricasse', 'soda'],
    note: 'After school with friends',
    seed: SEED,
    created_at: now,
  });

  const monday = weekStart(today);
  for (const [i, [energy, sleep, appetite, legs, note]] of CHECKINS.entries()) {
    const week = addDays(monday, -(i + 1) * 7);
    await db.collection(C.checkins).updateOne(
      { athlete_id: athlete.id, week },
      {
        $setOnInsert: {
          id: randomUUID(),
          user_id: athlete.user_id,
          club_id: athlete.club_id,
          energy,
          sleep,
          appetite,
          legs,
          note,
          seed: SEED,
          created_at: now,
          updated_at: now,
        },
      },
      { upsert: true }
    );
  }
}

type MakeSession = (
  date: string,
  title: string,
  from: number,
  to: number
) => PlanSession & Record<string, unknown>;

async function main() {
  const client = await getMongoClient();
  const db = client.db(mongoConfig().dbName);

  const athlete = await db
    .collection<Athlete>('athletes')
    .findOne(
      { email: 'demo.athlete@clubdee.com' },
      { projection: { _id: 0, id: 1, user_id: 1, club_id: 1 } }
    );
  const clubId = athlete?.club_id ?? DEMO_CLUB;
  const coach = await db.collection('coaches').findOne({ club_id: clubId });
  const coachId: string | null = coach?.user_id ?? null;

  const today = dayKey();
  const tomorrow = addDays(today, 1);
  const sessions = db.collection('training_sessions');

  // Start from a clean slate: everything this script added before.
  const removed = await sessions.deleteMany({ club_id: clubId, description: MARK });
  await Promise.all(Object.values(C).map((name) => db.collection(name).deleteMany({ seed: SEED })));

  if (process.argv.includes('--clear')) {
    console.log(`Removed ${removed.deletedCount} demo session(s) and the demo nutrition history.`);
    return;
  }

  const at = argValue('--at') ?? '17:30';
  if (!/^\d{1,2}:\d{2}$/.test(at)) throw new Error('--at expects HH:MM, e.g. --at 16:00');
  const start = toMinutes(at);
  const now = new Date();
  const makeSession: MakeSession = (date, title, from, to) => ({
    id: randomUUID(),
    club_id: clubId,
    coach_id: coachId,
    created_by: coachId,
    title,
    description: MARK,
    session_date: date,
    start_time: `${toClock(from)}:00`,
    end_time: `${toClock(to)}:00`,
    location: 'Pool A',
    status: 'scheduled',
    created_at: now,
    updated_at: now,
  });

  await sessions.insertMany([
    makeSession(today, 'Swim technique', start, start + 90),
    makeSession(tomorrow, 'Early endurance swim', 6 * 60 + 30, 7 * 60 + 30),
  ]);
  console.log(
    `Club ${clubId}: today ${today} at ${toClock(start)}, tomorrow ${tomorrow} at 06:30.`
  );

  if (process.argv.includes('--history')) {
    if (!athlete) throw new Error('Demo athlete not found: run npm run db:seed first.');
    await seedHistory(db, athlete, makeSession);
    console.log(
      `Added ${HISTORY_DAYS} past days and ${CHECKINS.length} weekly check-ins for the demo athlete.`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
