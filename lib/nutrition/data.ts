/**
 * Nutrition module — server-side data access (Server Components and Server Actions only).
 *
 * These collections are new, so they are read and written directly through the
 * MongoDB driver. Every function here scopes its query to the signed-in athlete
 * or to the clubs of the signed-in coach; callers must go through the context
 * helpers below rather than trusting ids sent from the browser.
 */
import { getDb } from '@/lib/db/mongo';
import { createClient } from '@/lib/db/server';
import { BASE_GLASS_GOAL, type CheckInScores, type MealType } from './catalog';
import { addDays, dayKey, lastDays, weekStart } from './dates';
import { NUTRITION_COLLECTIONS as COLLECTIONS } from './indexes';
import type { PlanSession } from './plan';
import { hydrationGoal, hydrationSummary, MIN_DAYS_FOR_HYDRATION_FLAG } from './tips';

export { hydrationGoal, trainingTip, type SessionSlot } from './tips';

export interface HydrationDoc {
  id: string;
  athlete_id: string;
  user_id: string;
  club_id: string;
  date: string;
  glasses: number;
  goal: number;
  updated_at: Date;
}

export interface MealDoc {
  id: string;
  athlete_id: string;
  user_id: string;
  club_id: string;
  date: string;
  meal_type: MealType;
  items: string[];
  note: string;
  /** Set when the meal was logged by ticking a step of the fuel plan. */
  plan_step?: string;
  created_at: Date;
}

/** One ticked step of a day's fuel plan. */
export interface PlanCheckDoc {
  id: string;
  athlete_id: string;
  user_id: string;
  club_id: string;
  date: string;
  step_id: string;
  /** The meal logged with the tick; removed again when the tick is undone. */
  meal_id: string | null;
  created_at: Date;
}

export interface CheckInDoc extends CheckInScores {
  id: string;
  athlete_id: string;
  user_id: string;
  club_id: string;
  week: string;
  note: string;
  created_at: Date;
  updated_at: Date;
}

export interface AthleteRef {
  id: string;
  user_id: string;
  club_id: string;
  first_name: string;
  last_name: string;
}

const NO_ID = { projection: { _id: 0 } } as const;

// ---------------------------------------------------------------------------
// Who is asking
// ---------------------------------------------------------------------------

async function currentUserId(): Promise<string | null> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  return user?.id ?? null;
}

/** The athlete row of the signed-in user, or null for anyone else. */
export async function getCurrentAthlete(): Promise<AthleteRef | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const db = await getDb();
  return db
    .collection<AthleteRef>('athletes')
    .findOne(
      { user_id: userId },
      { projection: { _id: 0, id: 1, user_id: 1, club_id: 1, first_name: 1, last_name: 1 } }
    );
}

/** Clubs the signed-in coach belongs to (admins see every club). Null if neither. */
export async function getStaffClubIds(): Promise<string[] | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const db = await getDb();
  const role = (await db.collection('user_roles').findOne({ user_id: userId }))?.role;
  if (role === 'admin') {
    return (
      await db
        .collection('clubs')
        .find({}, { projection: { _id: 0, id: 1 } })
        .toArray()
    ).map((c) => c.id);
  }
  if (role !== 'coach') return null;
  const rows = await db
    .collection('coaches')
    .find({ user_id: userId }, { projection: { _id: 0, club_id: 1 } })
    .toArray();
  return rows.map((r) => r.club_id).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Training awareness
// ---------------------------------------------------------------------------

export async function getSessionsOn(clubId: string, date: string): Promise<PlanSession[]> {
  const db = await getDb();
  return db
    .collection<PlanSession>('training_sessions')
    .find(
      { club_id: clubId, session_date: date, status: { $ne: 'cancelled' } },
      {
        projection: { _id: 0, id: 1, title: 1, start_time: 1, end_time: 1, location: 1 },
        sort: { start_time: 1 },
      }
    )
    .toArray();
}

// ---------------------------------------------------------------------------
// Athlete view
// ---------------------------------------------------------------------------

export interface DaySummary {
  date: string;
  glasses: number;
  goal: number;
  meals: number;
}

export interface AthleteNutrition {
  today: string;
  sessionsToday: PlanSession[];
  sessionsTomorrow: PlanSession[];
  /** Ids of the fuel-plan steps ticked today. */
  planChecks: string[];
  hydration: { glasses: number; goal: number };
  meals: Omit<MealDoc, 'user_id' | 'club_id' | 'athlete_id'>[];
  week: DaySummary[];
  checkIn: (CheckInScores & { note: string }) | null;
  weekStart: string;
}

export async function getAthleteNutrition(athlete: AthleteRef): Promise<AthleteNutrition> {
  const db = await getDb();
  const today = dayKey();
  const days = lastDays(today, 7);
  const monday = weekStart(today);

  const [sessionsToday, sessionsTomorrow, planChecks, hydrationDocs, mealDocs, checkIn] =
    await Promise.all([
      getSessionsOn(athlete.club_id, today),
      getSessionsOn(athlete.club_id, addDays(today, 1)),
      db
        .collection<PlanCheckDoc>(COLLECTIONS.planChecks)
        .find({ athlete_id: athlete.id, date: today }, { projection: { _id: 0, step_id: 1 } })
        .toArray(),
      db
        .collection<HydrationDoc>(COLLECTIONS.hydration)
        .find({ athlete_id: athlete.id, date: { $gte: days[0], $lte: today } }, NO_ID)
        .toArray(),
      db
        .collection<MealDoc>(COLLECTIONS.meals)
        .find(
          { athlete_id: athlete.id, date: { $gte: days[0], $lte: today } },
          { ...NO_ID, sort: { created_at: 1 } }
        )
        .toArray(),
      db
        .collection<CheckInDoc>(COLLECTIONS.checkins)
        .findOne({ athlete_id: athlete.id, week: monday }, NO_ID),
    ]);

  const goalToday = hydrationGoal(sessionsToday.length);
  const byDay = new Map(hydrationDocs.map((h) => [h.date, h]));
  const week = days.map((date) => ({
    date,
    glasses: byDay.get(date)?.glasses ?? 0,
    goal: date === today ? goalToday : (byDay.get(date)?.goal ?? BASE_GLASS_GOAL),
    meals: mealDocs.filter((m) => m.date === date).length,
  }));

  return {
    today,
    sessionsToday,
    sessionsTomorrow,
    planChecks: planChecks.map((c) => c.step_id),
    hydration: { glasses: byDay.get(today)?.glasses ?? 0, goal: goalToday },
    meals: mealDocs
      .filter((m) => m.date === today)
      .map(({ id, date, meal_type, items, note, created_at }) => ({
        id,
        date,
        meal_type,
        items,
        note,
        created_at,
      })),
    week,
    checkIn: checkIn
      ? {
          energy: checkIn.energy,
          sleep: checkIn.sleep,
          appetite: checkIn.appetite,
          legs: checkIn.legs,
          note: checkIn.note,
        }
      : null,
    weekStart: monday,
  };
}

// ---------------------------------------------------------------------------
// Coach view
// ---------------------------------------------------------------------------

export type TeamFlag = 'low_energy' | 'low_hydration' | 'not_logging';

export interface TeamRow {
  athleteId: string;
  name: string;
  /** Average share of the hydration goal reached since the athlete's first log in the last 7 days (0–100). */
  hydrationPct: number;
  /** How many of the last 7 days that average covers (0 when nothing was logged). */
  hydrationDays: number;
  todayGlasses: number;
  mealsThisWeek: number;
  lastLog: string | null;
  checkIn: (CheckInScores & { note: string }) | null;
  flags: TeamFlag[];
}

export interface TeamNutrition {
  rows: TeamRow[];
  weekStart: string;
}

export async function getTeamNutrition(clubIds: string[]): Promise<TeamNutrition> {
  const db = await getDb();
  const today = dayKey();
  const days = lastDays(today, 7);
  const monday = weekStart(today);
  const staleBefore = addDays(today, -2); // nothing in the last 3 days

  const athletes = await db
    .collection<AthleteRef>('athletes')
    .find(
      { club_id: { $in: clubIds } },
      { projection: { _id: 0, id: 1, user_id: 1, club_id: 1, first_name: 1, last_name: 1 } }
    )
    .sort({ first_name: 1, last_name: 1 })
    .toArray();
  const ids = athletes.map((a) => a.id);

  const [hydration, meals, checkins] = await Promise.all([
    db
      .collection<HydrationDoc>(COLLECTIONS.hydration)
      .find({ athlete_id: { $in: ids }, date: { $gte: days[0] } }, NO_ID)
      .toArray(),
    db
      .collection<MealDoc>(COLLECTIONS.meals)
      .find(
        { athlete_id: { $in: ids }, date: { $gte: days[0] } },
        { projection: { _id: 0, athlete_id: 1, date: 1 } }
      )
      .toArray(),
    db
      .collection<CheckInDoc>(COLLECTIONS.checkins)
      .find({ athlete_id: { $in: ids }, week: monday }, NO_ID)
      .toArray(),
  ]);

  const rows = athletes.map<TeamRow>((athlete) => {
    const h = hydration.filter((d) => d.athlete_id === athlete.id);
    const m = meals.filter((d) => d.athlete_id === athlete.id);
    const c = checkins.find((d) => d.athlete_id === athlete.id) ?? null;

    const { pct: hydrationPct, daysTracked } = hydrationSummary(days, h);
    const logDates = [
      ...h.filter((d) => d.glasses > 0).map((d) => d.date),
      ...m.map((d) => d.date),
    ].sort();
    const lastLog = logDates.at(-1) ?? null;

    const flags: TeamFlag[] = [];
    if (!lastLog || lastLog < staleBefore) flags.push('not_logging');
    // Not on the first days: someone who started logging today is not "low", just new.
    else if (daysTracked >= MIN_DAYS_FOR_HYDRATION_FLAG && hydrationPct < 50)
      flags.push('low_hydration');
    if (c && (c.energy <= 2 || (c.energy + c.sleep + c.appetite + c.legs) / 4 <= 2.5))
      flags.push('low_energy');

    return {
      athleteId: athlete.id,
      name: `${athlete.first_name ?? ''} ${athlete.last_name ?? ''}`.trim() || 'Athlete',
      hydrationPct,
      hydrationDays: daysTracked,
      todayGlasses: h.find((d) => d.date === today)?.glasses ?? 0,
      mealsThisWeek: m.length,
      lastLog,
      checkIn: c
        ? { energy: c.energy, sleep: c.sleep, appetite: c.appetite, legs: c.legs, note: c.note }
        : null,
      flags,
    };
  });

  return { rows, weekStart: monday };
}

// ---------------------------------------------------------------------------
// Housekeeping
// ---------------------------------------------------------------------------

/** Removes every nutrition record of an account that is being deleted. */
export async function deleteNutritionData(userId: string): Promise<void> {
  const db = await getDb();
  await Promise.all(
    Object.values(COLLECTIONS).map((name) => db.collection(name).deleteMany({ user_id: userId }))
  );
}
