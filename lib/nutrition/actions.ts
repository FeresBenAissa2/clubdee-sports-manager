'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db/mongo';
import {
  CHECKIN_FIELDS,
  FOOD_BY_ID,
  MAX_GLASSES,
  MEAL_TYPE_IDS,
  NOTE_MAX,
  type CheckInScores,
  type MealType,
} from './catalog';
import {
  getCurrentAthlete,
  getEffectivePlan,
  getSessionsOn,
  hydrationGoal,
  type CheckInDoc,
  type HydrationDoc,
  type BodyMetricDoc,
  type MealDoc,
  type PlanCheckDoc,
} from './data';
import { dayKey, weekStart } from './dates';
import { HEIGHT_RANGE, validMetrics, WEIGHT_RANGE } from './energy';
import { NUTRITION_COLLECTIONS as COLLECTIONS } from './indexes';
import { buildFuelPlan } from './plan';
import { isAdult, portionsForSteps } from './portions';

type Result = { ok: true } | { ok: false; error: string };

const NOT_ATHLETE: Result = { ok: false, error: 'Only athletes can log nutrition.' };

function refresh() {
  revalidatePath('/dashboard/athlete/nutrition');
  revalidatePath('/dashboard/coach/nutrition');
}

const cleanNote = (note: unknown) =>
  typeof note === 'string' ? note.trim().slice(0, NOTE_MAX) : '';

/** Adds (+1) or removes (-1) a glass of water for today. */
export async function changeGlasses(delta: 1 | -1): Promise<Result & { glasses?: number }> {
  if (delta !== 1 && delta !== -1) return { ok: false, error: 'Invalid change.' };
  const athlete = await getCurrentAthlete();
  if (!athlete) return NOT_ATHLETE;

  const db = await getDb();
  const date = dayKey();
  const goal = hydrationGoal((await getSessionsOn(athlete.club_id, date)).length);
  const hydration = db.collection<HydrationDoc>(COLLECTIONS.hydration);

  // Create today's row if needed, then move the counter within [0, MAX_GLASSES].
  await hydration.updateOne(
    { athlete_id: athlete.id, date },
    {
      $setOnInsert: {
        id: randomUUID(),
        user_id: athlete.user_id,
        club_id: athlete.club_id,
        glasses: 0,
      },
      $set: { goal, updated_at: new Date() },
    },
    { upsert: true }
  );
  const bound = delta > 0 ? { $lt: MAX_GLASSES } : { $gt: 0 };
  await hydration.updateOne(
    { athlete_id: athlete.id, date, glasses: bound },
    { $inc: { glasses: delta } }
  );

  const doc = await hydration.findOne({ athlete_id: athlete.id, date });
  refresh();
  return { ok: true, glasses: doc?.glasses ?? 0 };
}

export async function logMeal(input: {
  mealType: string;
  items: string[];
  note?: string;
}): Promise<Result> {
  const athlete = await getCurrentAthlete();
  if (!athlete) return NOT_ATHLETE;
  if (!MEAL_TYPE_IDS.has(input.mealType)) return { ok: false, error: 'Choose a meal type.' };

  const items = [...new Set(Array.isArray(input.items) ? input.items : [])]
    .filter((id) => FOOD_BY_ID.has(id))
    .slice(0, 12);
  const note = cleanNote(input.note);
  if (items.length === 0 && !note)
    return { ok: false, error: 'Pick at least one dish or write what you ate.' };

  const db = await getDb();
  await db.collection<MealDoc>(COLLECTIONS.meals).insertOne({
    id: randomUUID(),
    athlete_id: athlete.id,
    user_id: athlete.user_id,
    club_id: athlete.club_id,
    date: dayKey(),
    meal_type: input.mealType as MealType,
    items,
    note,
    created_at: new Date(),
  });
  refresh();
  return { ok: true };
}

export async function deleteMeal(id: string): Promise<Result> {
  const athlete = await getCurrentAthlete();
  if (!athlete) return NOT_ATHLETE;
  if (typeof id !== 'string') return { ok: false, error: 'Meal not found.' };

  const db = await getDb();
  const { deletedCount } = await db
    .collection<MealDoc>(COLLECTIONS.meals)
    .deleteOne({ id, athlete_id: athlete.id });
  if (!deletedCount) return { ok: false, error: 'Meal not found.' };
  // A meal logged from the fuel plan takes its tick with it.
  await db
    .collection<PlanCheckDoc>(COLLECTIONS.planChecks)
    .deleteMany({ athlete_id: athlete.id, meal_id: id });
  refresh();
  return { ok: true };
}

/** Saves this week's check-in; submitting again the same week updates it. */
export async function saveCheckIn(
  input: Partial<CheckInScores> & { note?: string }
): Promise<Result> {
  const athlete = await getCurrentAthlete();
  if (!athlete) return NOT_ATHLETE;

  const scores = {} as CheckInScores;
  for (const field of CHECKIN_FIELDS) {
    const value = Number(input[field.id]);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return { ok: false, error: `Rate your ${field.label.toLowerCase()} from 1 to 5.` };
    }
    scores[field.id] = value;
  }

  const db = await getDb();
  const now = new Date();
  await db.collection<CheckInDoc>(COLLECTIONS.checkins).updateOne(
    { athlete_id: athlete.id, week: weekStart(dayKey(now)) },
    {
      $set: { ...scores, note: cleanNote(input.note), updated_at: now },
      $setOnInsert: {
        id: randomUUID(),
        user_id: athlete.user_id,
        club_id: athlete.club_id,
        created_at: now,
      },
    },
    { upsert: true }
  );
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Fuel plan
// ---------------------------------------------------------------------------

/**
 * Ticks a step of today's fuel plan. Meal steps also log a meal, so meal counts
 * (athlete week, coach page) include it. The plan is rebuilt here from the
 * club's sessions: a step id sent by the browser is only accepted if it is in it.
 */
export async function checkPlanStep(stepId: string, items: string[] = []): Promise<Result> {
  const athlete = await getCurrentAthlete();
  if (!athlete) return NOT_ATHLETE;
  if (typeof stepId !== 'string') return { ok: false, error: 'Unknown step.' };

  const date = dayKey();
  const [sessions, plan] = await Promise.all([
    getSessionsOn(athlete.club_id, date),
    getEffectivePlan(athlete),
  ]);
  const steps = buildFuelPlan(sessions);
  const step = steps.find((s) => s.id === stepId);
  if (!step)
    return { ok: false, error: 'This step is no longer in today’s plan. Refresh the page.' };
  // With a coach's meal plan, the tick records the planned portions in grams.
  const portions = plan ? (portionsForSteps(steps, plan.config).get(step.id) ?? []) : [];

  const db = await getDb();
  const checks = db.collection<PlanCheckDoc>(COLLECTIONS.planChecks);
  if (await checks.findOne({ athlete_id: athlete.id, date, step_id: step.id })) return { ok: true };

  let mealId: string | null = null;
  if (step.mealType) {
    const picked =
      portions.length > 0
        ? portions.map((p) => p.food_id)
        : [...new Set(Array.isArray(items) ? items : [])]
            .filter((id) => FOOD_BY_ID.has(id))
            .slice(0, 12);
    mealId = randomUUID();
    await db.collection<MealDoc>(COLLECTIONS.meals).insertOne({
      id: mealId,
      athlete_id: athlete.id,
      user_id: athlete.user_id,
      club_id: athlete.club_id,
      date,
      meal_type: step.mealType,
      items: picked,
      note: picked.length ? '' : step.title,
      plan_step: step.id,
      ...(portions.length > 0 && { portions }),
      created_at: new Date(),
    });
  }

  try {
    await checks.insertOne({
      id: randomUUID(),
      athlete_id: athlete.id,
      user_id: athlete.user_id,
      club_id: athlete.club_id,
      date,
      step_id: step.id,
      meal_id: mealId,
      created_at: new Date(),
    });
  } catch (error) {
    // A double tap raced us to the unique index: keep a single meal.
    if (mealId) await db.collection<MealDoc>(COLLECTIONS.meals).deleteOne({ id: mealId });
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  refresh();
  return { ok: true };
}

/** Undoes a tick and removes the meal it logged. */
export async function uncheckPlanStep(stepId: string): Promise<Result> {
  const athlete = await getCurrentAthlete();
  if (!athlete) return NOT_ATHLETE;
  if (typeof stepId !== 'string') return { ok: false, error: 'Unknown step.' };

  const db = await getDb();
  const check = await db
    .collection<PlanCheckDoc>(COLLECTIONS.planChecks)
    .findOneAndDelete({ athlete_id: athlete.id, date: dayKey(), step_id: stepId });
  if (check?.meal_id) {
    await db
      .collection<MealDoc>(COLLECTIONS.meals)
      .deleteOne({ id: check.meal_id, athlete_id: athlete.id });
  }
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Body data (adults record their own; a coach records it for under-18s)
// ---------------------------------------------------------------------------

export async function saveMyBodyMetrics(input: {
  heightCm: unknown;
  weightKg: unknown;
}): Promise<Result> {
  const athlete = await getCurrentAthlete();
  if (!athlete) return NOT_ATHLETE;
  const date = dayKey();
  // Weighing is sensitive for teenagers: their coach records it instead.
  if (!isAdult(athlete.date_of_birth, date)) {
    return { ok: false, error: 'Your coach records your height and weight at the club.' };
  }
  const metrics = validMetrics(input?.heightCm, input?.weightKg);
  if (!metrics) {
    return {
      ok: false,
      error: `Enter a height between ${HEIGHT_RANGE.min} and ${HEIGHT_RANGE.max} cm and a weight between ${WEIGHT_RANGE.min} and ${WEIGHT_RANGE.max} kg.`,
    };
  }
  const db = await getDb();
  await db.collection<BodyMetricDoc>(COLLECTIONS.bodyMetrics).updateOne(
    { athlete_id: athlete.id, date },
    {
      $set: {
        height_cm: metrics.heightCm,
        weight_kg: metrics.weightKg,
        recorded_by: 'athlete',
        recorder_id: athlete.user_id,
        created_at: new Date(),
      },
      $setOnInsert: { id: randomUUID(), user_id: athlete.user_id, club_id: athlete.club_id },
    },
    { upsert: true }
  );
  refresh();
  return { ok: true };
}
