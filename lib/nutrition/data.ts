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
import { buildFuelPlan, planSummary, type FuelStep, type PlanSession } from './plan';
import { hydrationGoal, hydrationSummary, nutritionFlags, type TeamFlag } from './tips';

export {
  hydrationGoal,
  nutritionFlags,
  trainingTip,
  type SessionSlot,
  type TeamFlag,
} from './tips';

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

/** A club's sessions for several days at once, keyed by `club_id|date`. */
async function sessionsByClubDay(
  clubIds: string[],
  days: string[]
): Promise<Map<string, PlanSession[]>> {
  const db = await getDb();
  const rows = await db
    .collection<PlanSession & { club_id: string; session_date: string }>('training_sessions')
    .find(
      { club_id: { $in: clubIds }, session_date: { $in: days }, status: { $ne: 'cancelled' } },
      {
        projection: {
          _id: 0,
          id: 1,
          title: 1,
          start_time: 1,
          end_time: 1,
          location: 1,
          club_id: 1,
          session_date: 1,
        },
        sort: { start_time: 1 },
      }
    )
    .toArray();
  const map = new Map<string, PlanSession[]>();
  for (const { club_id, session_date, ...session } of rows) {
    const key = `${club_id}|${session_date}`;
    map.set(key, [...(map.get(key) ?? []), session]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// History (athlete and coach)
// ---------------------------------------------------------------------------

export interface HistoryMeal {
  id: string;
  meal_type: MealType;
  items: string[];
  note: string;
  plan_step: string | null;
}

/** Everything recorded for one athlete on one day, with the plan that day's sessions gave. */
export interface NutritionDay {
  date: string;
  sessions: PlanSession[];
  steps: FuelStep[];
  done: string[];
  meals: HistoryMeal[];
  glasses: number;
  goal: number;
}

/** `days` oldest first. Callers must already have checked who may see this athlete. */
export async function getNutritionHistory(
  athlete: AthleteRef,
  days: string[]
): Promise<NutritionDay[]> {
  const db = await getDb();
  const range = { athlete_id: athlete.id, date: { $in: days } };
  const [sessions, checks, meals, hydration] = await Promise.all([
    sessionsByClubDay([athlete.club_id], days),
    db
      .collection<PlanCheckDoc>(COLLECTIONS.planChecks)
      .find(range, { projection: { _id: 0, date: 1, step_id: 1 } })
      .toArray(),
    db
      .collection<MealDoc>(COLLECTIONS.meals)
      .find(range, { ...NO_ID, sort: { created_at: 1 } })
      .toArray(),
    db.collection<HydrationDoc>(COLLECTIONS.hydration).find(range, NO_ID).toArray(),
  ]);

  const today = dayKey();
  return days.map((date) => {
    const daySessions = sessions.get(`${athlete.club_id}|${date}`) ?? [];
    const water = hydration.find((h) => h.date === date);
    const steps = buildFuelPlan(daySessions);
    const stepIds = new Set(steps.map((s) => s.id));
    return {
      date,
      sessions: daySessions,
      steps,
      // Ticks of steps that left the plan (a session moved or was cancelled) no longer count.
      done: checks.filter((c) => c.date === date && stepIds.has(c.step_id)).map((c) => c.step_id),
      meals: meals
        .filter((m) => m.date === date)
        .map((m) => ({
          id: m.id,
          meal_type: m.meal_type,
          items: m.items,
          note: m.note,
          plan_step: m.plan_step ?? null,
        })),
      glasses: water?.glasses ?? 0,
      // Today's goal follows today's schedule (as on the athlete page); past days keep the goal they had.
      goal:
        date === today
          ? hydrationGoal(daySessions.length)
          : (water?.goal ?? hydrationGoal(daySessions.length)),
    };
  });
}

export interface StaffAthlete extends AthleteRef {
  clubName: string;
}

/** The athlete, only if they belong to one of the given clubs (the staff member's). */
export async function getAthleteForStaff(
  athleteId: string,
  clubIds: string[]
): Promise<StaffAthlete | null> {
  if (typeof athleteId !== 'string' || clubIds.length === 0) return null;
  const db = await getDb();
  const athlete = await db
    .collection<AthleteRef>('athletes')
    .findOne(
      { id: athleteId, club_id: { $in: clubIds } },
      { projection: { _id: 0, id: 1, user_id: 1, club_id: 1, first_name: 1, last_name: 1 } }
    );
  if (!athlete) return null;
  const club = await db
    .collection('clubs')
    .findOne({ id: athlete.club_id }, { projection: { _id: 0, name: 1 } });
  return { ...athlete, clubName: (club?.name as string | undefined) ?? '' };
}

export type CheckInEntry = CheckInScores & { week: string; note: string };

/** Weekly check-ins for the given Mondays, oldest first (weeks without one are left out). */
export async function getCheckInHistory(
  athleteId: string,
  weeks: string[]
): Promise<CheckInEntry[]> {
  const db = await getDb();
  const rows = await db
    .collection<CheckInDoc>(COLLECTIONS.checkins)
    .find({ athlete_id: athleteId, week: { $in: weeks } }, NO_ID)
    .sort({ week: 1 })
    .toArray();
  return rows.map((c) => ({
    week: c.week,
    energy: c.energy,
    sleep: c.sleep,
    appetite: c.appetite,
    legs: c.legs,
    note: c.note,
  }));
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

export interface TeamRow {
  athleteId: string;
  name: string;
  /** Average share of the hydration goal reached since the athlete's first log in the last 7 days (0–100). */
  hydrationPct: number;
  /** How many of the last 7 days that average covers (0 when nothing was logged). */
  hydrationDays: number;
  todayGlasses: number;
  /** Share of fuel-plan steps ticked since the athlete's first tick in the last 7 days (0–100). */
  planPct: number;
  /** How many of the last 7 days that share covers (0 when the plan was never used). */
  planDays: number;
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

  const [hydration, meals, checkins, planChecks, sessions] = await Promise.all([
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
    db
      .collection<PlanCheckDoc>(COLLECTIONS.planChecks)
      .find(
        { athlete_id: { $in: ids }, date: { $gte: days[0] } },
        { projection: { _id: 0, athlete_id: 1, date: 1, step_id: 1 } }
      )
      .toArray(),
    sessionsByClubDay(clubIds, days),
  ]);

  // Step ids planned per club and day (the plan only depends on the club's sessions).
  const plans = new Map<string, Set<string>>();
  const planFor = (clubId: string, date: string) => {
    const key = `${clubId}|${date}`;
    if (!plans.has(key))
      plans.set(key, new Set(buildFuelPlan(sessions.get(key) ?? []).map((s) => s.id)));
    return plans.get(key)!;
  };

  const rows = athletes.map<TeamRow>((athlete) => {
    const doneByDay = new Map<string, number>();
    for (const c of planChecks) {
      // Ticks of steps that left the plan (session moved or cancelled) no longer count.
      if (c.athlete_id === athlete.id && planFor(athlete.club_id, c.date).has(c.step_id)) {
        doneByDay.set(c.date, (doneByDay.get(c.date) ?? 0) + 1);
      }
    }
    const plan = planSummary(days, (date) => planFor(athlete.club_id, date).size, doneByDay);
    // Today's water goal follows today's schedule, as on the athlete's own page.
    const goalToday = hydrationGoal((sessions.get(`${athlete.club_id}|${today}`) ?? []).length);
    const h = hydration
      .filter((d) => d.athlete_id === athlete.id)
      .map((d) => (d.date === today ? { ...d, goal: goalToday } : d));
    const m = meals.filter((d) => d.athlete_id === athlete.id);
    const c = checkins.find((d) => d.athlete_id === athlete.id) ?? null;

    const { pct: hydrationPct, daysTracked } = hydrationSummary(days, h);
    const logDates = [
      ...h.filter((d) => d.glasses > 0).map((d) => d.date),
      ...m.map((d) => d.date),
    ].sort();
    const lastLog = logDates.at(-1) ?? null;

    const flags = nutritionFlags({
      lastLog,
      staleBefore,
      hydrationPct,
      hydrationDays: daysTracked,
      checkIn: c,
    });

    return {
      athleteId: athlete.id,
      name: `${athlete.first_name ?? ''} ${athlete.last_name ?? ''}`.trim() || 'Athlete',
      hydrationPct,
      hydrationDays: daysTracked,
      todayGlasses: h.find((d) => d.date === today)?.glasses ?? 0,
      planPct: plan.pct,
      planDays: plan.daysTracked,
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
