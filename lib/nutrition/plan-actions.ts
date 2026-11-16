'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db/mongo';
import {
  currentUserId,
  getAthleteForStaff,
  getStaffClubIds,
  type BodyMetricDoc,
  type MealPlanDoc,
  type NutritionProfileDoc,
} from './data';
import { addDays, dayKey } from './dates';
import { GOALS, HEIGHT_RANGE, validMetrics, WEIGHT_RANGE, type Goal } from './energy';
import { NUTRITION_COLLECTIONS as COLLECTIONS } from './indexes';
import {
  cleanMeal,
  isAdult,
  MEAL_KIND_IDS,
  PLAN_LEVELS,
  PLAN_STYLES,
  type MealKind,
  type PortionItem,
} from './portions';

type Result = { ok: true } | { ok: false; error: string };

export interface SavePlanInput {
  scope: 'club' | 'athlete';
  /** Club id for a team plan, athlete id for an athlete's plan. */
  targetId: string;
  level: number;
  style: string;
  /** Only the meals the coach changed; the others stay generated. */
  meals: Record<string, unknown>;
}

function refresh() {
  revalidatePath('/dashboard/athlete/nutrition');
  revalidatePath('/dashboard/coach/nutrition', 'layout');
}

/** Who the plan is for, checked against the coach's own clubs. */
async function resolveTarget(
  scope: unknown,
  targetId: unknown
): Promise<
  | { ok: true; clubId: string; athleteId: string | null; userId: string | null }
  | { ok: false; error: string }
> {
  const clubIds = await getStaffClubIds();
  if (!clubIds) return { ok: false, error: 'Only coaches can edit meal plans.' };
  if (typeof targetId !== 'string') return { ok: false, error: 'Unknown team or athlete.' };
  if (scope === 'club') {
    if (!clubIds.includes(targetId)) return { ok: false, error: 'This team is not yours.' };
    return { ok: true, clubId: targetId, athleteId: null, userId: null };
  }
  if (scope === 'athlete') {
    const athlete = await getAthleteForStaff(targetId, clubIds);
    if (!athlete) return { ok: false, error: 'This athlete is not in your teams.' };
    return { ok: true, clubId: athlete.club_id, athleteId: athlete.id, userId: athlete.user_id };
  }
  return { ok: false, error: 'Unknown plan type.' };
}

export async function saveMealPlan(input: SavePlanInput): Promise<Result> {
  const target = await resolveTarget(input?.scope, input?.targetId);
  if (!target.ok) return target;

  const level = Number(input.level);
  if (!(PLAN_LEVELS as readonly number[]).includes(level)) {
    return { ok: false, error: 'Choose one of the calorie levels.' };
  }
  const style = PLAN_STYLES.find((s) => s.id === input.style)?.id;
  if (!style) return { ok: false, error: 'Choose a plan style.' };

  const meals: Partial<Record<MealKind, PortionItem[]>> = {};
  for (const [kind, items] of Object.entries(input.meals ?? {})) {
    if (!MEAL_KIND_IDS.has(kind)) return { ok: false, error: 'Unknown meal.' };
    const clean = cleanMeal(items);
    if (!clean) {
      return {
        ok: false,
        error: 'Each food needs between 5 g and 1000 g, with at most 8 foods per meal.',
      };
    }
    if (clean.length > 0) meals[kind as MealKind] = clean;
  }

  const db = await getDb();
  const userId = (await currentUserId()) ?? 'unknown';
  await db.collection<MealPlanDoc>(COLLECTIONS.mealPlans).updateOne(
    { scope: input.scope, club_id: target.clubId, athlete_id: target.athleteId },
    {
      $set: {
        level_kcal: level,
        style,
        meals,
        user_id: target.userId,
        updated_by: userId,
        updated_at: new Date(),
      },
      $setOnInsert: { id: randomUUID() },
    },
    { upsert: true }
  );
  refresh();
  return { ok: true };
}

/** Removes an athlete's own plan, so the team plan applies again. */
export async function resetAthletePlan(athleteId: string): Promise<Result> {
  const target = await resolveTarget('athlete', athleteId);
  if (!target.ok) return target;
  const db = await getDb();
  await db
    .collection<MealPlanDoc>(COLLECTIONS.mealPlans)
    .deleteOne({ scope: 'athlete', athlete_id: target.athleteId });
  refresh();
  return { ok: true };
}

/** Removes a team plan: athletes without their own plan go back to food ideas only. */
export async function deleteClubPlan(clubId: string): Promise<Result> {
  const target = await resolveTarget('club', clubId);
  if (!target.ok) return target;
  const db = await getDb();
  await db
    .collection<MealPlanDoc>(COLLECTIONS.mealPlans)
    .deleteOne({ scope: 'club', club_id: target.clubId, athlete_id: null });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Body data and energy settings (coach)
// ---------------------------------------------------------------------------

/** Records a height and weight for one of the coach's athletes (one entry per day). */
export async function recordBodyMetrics(input: {
  athleteId: string;
  heightCm: unknown;
  weightKg: unknown;
  date?: unknown;
}): Promise<Result> {
  const clubIds = await getStaffClubIds();
  if (!clubIds) return { ok: false, error: 'Only coaches can record measurements.' };
  const athlete = await getAthleteForStaff(input?.athleteId, clubIds);
  if (!athlete) return { ok: false, error: 'This athlete is not in your teams.' };

  const metrics = validMetrics(input.heightCm, input.weightKg);
  if (!metrics) {
    return {
      ok: false,
      error: `Height must be ${HEIGHT_RANGE.min}–${HEIGHT_RANGE.max} cm and weight ${WEIGHT_RANGE.min}–${WEIGHT_RANGE.max} kg.`,
    };
  }
  const today = dayKey();
  const date = typeof input.date === 'string' && input.date ? input.date : today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today || date < addDays(today, -365)) {
    return { ok: false, error: 'Choose a date within the last year.' };
  }

  const db = await getDb();
  await db.collection<BodyMetricDoc>(COLLECTIONS.bodyMetrics).updateOne(
    { athlete_id: athlete.id, date },
    {
      $set: {
        height_cm: metrics.heightCm,
        weight_kg: metrics.weightKg,
        recorded_by: 'coach',
        recorder_id: (await currentUserId()) ?? 'unknown',
        created_at: new Date(),
      },
      $setOnInsert: { id: randomUUID(), user_id: athlete.user_id, club_id: athlete.club_id },
    },
    { upsert: true }
  );
  refresh();
  return { ok: true };
}

/** Goal and level mode for one athlete. Under-18s always keep the "maintain" goal. */
export async function saveEnergySettings(input: {
  athleteId: string;
  goal: unknown;
  levelMode: unknown;
  fixedLevel?: unknown;
}): Promise<Result> {
  const clubIds = await getStaffClubIds();
  if (!clubIds) return { ok: false, error: 'Only coaches can change energy settings.' };
  const athlete = await getAthleteForStaff(input?.athleteId, clubIds);
  if (!athlete) return { ok: false, error: 'This athlete is not in your teams.' };

  const goal = GOALS.find((g) => g.id === input.goal)?.id;
  if (!goal) return { ok: false, error: 'Choose a goal.' };
  if (input.levelMode !== 'auto' && input.levelMode !== 'fixed') {
    return { ok: false, error: 'Choose automatic or fixed level.' };
  }
  const fixedLevel = input.levelMode === 'fixed' ? Number(input.fixedLevel) : null;
  if (fixedLevel !== null && !PLAN_LEVELS.includes(fixedLevel)) {
    return { ok: false, error: 'Choose one of the calorie levels.' };
  }
  const safeGoal: Goal = isAdult(athlete.date_of_birth, dayKey()) ? goal : 'maintain';

  const db = await getDb();
  await db.collection<NutritionProfileDoc>(COLLECTIONS.profiles).updateOne(
    { athlete_id: athlete.id },
    {
      $set: {
        goal: safeGoal,
        level_mode: input.levelMode,
        fixed_level: fixedLevel,
        updated_by: (await currentUserId()) ?? 'unknown',
        updated_at: new Date(),
      },
      $setOnInsert: { id: randomUUID(), user_id: athlete.user_id, club_id: athlete.club_id },
    },
    { upsert: true }
  );
  refresh();
  return { ok: true };
}
