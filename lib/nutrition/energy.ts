/**
 * Nutrition module — daily energy need from body data and training load (pure).
 *
 * Resting energy (BMR):
 * - 18 and over: Mifflin-St Jeor (height, weight, age, sex);
 * - 3 to 17: Schofield (WHO/FAO/UNU), weight-based — the usual choice for young athletes.
 * Daily need = BMR × an activity factor from the club's training hours, plus a goal
 * adjustment for adults, rounded to one of the meal plan levels.
 */
import { toMinutes } from './plan';
import { PLAN_LEVELS } from './portions';

export type Sex = 'male' | 'female';
export type Goal = 'maintain' | 'gain' | 'reduce';

export const GOALS: { id: Goal; label: string; kcal: number }[] = [
  { id: 'maintain', label: 'Maintain', kcal: 0 },
  { id: 'gain', label: 'Gain (build muscle)', kcal: 300 },
  { id: 'reduce', label: 'Reduce', kcal: -300 },
];

export const HEIGHT_RANGE = { min: 120, max: 230 } as const;
export const WEIGHT_RANGE = { min: 25, max: 200 } as const;

/** A session without times counts as this many minutes of training. */
const DEFAULT_SESSION_MIN = 90;

/** Activity factor bands by weekly training hours (upper bound exclusive). */
const ACTIVITY: { below: number; factor: number; label: string }[] = [
  { below: 1, factor: 1.4, label: 'little training' },
  { below: 3, factor: 1.55, label: 'light training' },
  { below: 6, factor: 1.7, label: 'regular training' },
  { below: 10, factor: 1.85, label: 'heavy training' },
  { below: Infinity, factor: 2.0, label: 'very heavy training' },
];

export function activityFactor(hoursPerWeek: number): { factor: number; label: string } {
  const band = ACTIVITY.find((b) => hoursPerWeek < b.below) ?? ACTIVITY[ACTIVITY.length - 1];
  return { factor: band.factor, label: band.label };
}

/** Average weekly training hours from sessions over `days` days (28 = four weeks). */
export function weeklyTrainingHours(
  sessions: { start_time: string | null; end_time: string | null }[],
  days = 28
): number {
  const minutes = sessions.reduce((sum, s) => {
    if (!s.start_time || !s.end_time) return sum + DEFAULT_SESSION_MIN;
    return sum + Math.max(0, toMinutes(s.end_time) - toMinutes(s.start_time));
  }, 0);
  return Math.round((minutes / 60 / (days / 7)) * 10) / 10;
}

/** Whole years between a birth date and `today` (`YYYY-MM-DD`); null when unknown. */
export function ageOn(dateOfBirth: unknown, today: string): number | null {
  const raw =
    dateOfBirth instanceof Date
      ? dateOfBirth.toISOString()
      : typeof dateOfBirth === 'string'
        ? dateOfBirth
        : '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!m) return null;
  const [y, mo, d] = today.split('-').map(Number);
  let age = y - Number(m[1]);
  if (mo < Number(m[2]) || (mo === Number(m[2]) && d < Number(m[3]))) age--;
  return age >= 0 ? age : null;
}

export const toSex = (gender: unknown): Sex | null =>
  gender === 'male' || gender === 'female' ? gender : null;

function bmrFor(sex: Sex, age: number, weightKg: number, heightCm: number) {
  if (age >= 18) {
    return {
      kcal: 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161),
      formula: 'Mifflin-St Jeor',
    };
  }
  if (age >= 10) {
    return {
      kcal: sex === 'male' ? 17.686 * weightKg + 658.2 : 13.384 * weightKg + 692.6,
      formula: 'Schofield (10–17 years)',
    };
  }
  return {
    kcal: sex === 'male' ? 22.706 * weightKg + 504.3 : 20.315 * weightKg + 485.9,
    formula: 'Schofield (3–9 years)',
  };
}

export interface EnergyInput {
  age: number;
  sex: Sex | null;
  heightCm: number;
  weightKg: number;
  hoursPerWeek: number;
  goal: Goal;
}

export interface EnergyBreakdown {
  age: number;
  sex: Sex | null;
  formula: string;
  bmr: number;
  hoursPerWeek: number;
  factor: number;
  activity: string;
  /** Goal actually applied (always "maintain" under 18). */
  goal: Goal;
  goalKcal: number;
  /** Before rounding to a level. */
  raw: number;
  /** The meal plan level used. */
  level: number;
}

export function nearestLevel(kcal: number): number {
  return PLAN_LEVELS.reduce((best, l) => (Math.abs(l - kcal) < Math.abs(best - kcal) ? l : best));
}

export function dailyEnergy(input: EnergyInput): EnergyBreakdown {
  const { age, sex, heightCm, weightKg, hoursPerWeek } = input;
  // Unknown sex: halfway between the two formulas.
  const bmr = sex
    ? bmrFor(sex, age, weightKg, heightCm)
    : {
        kcal:
          (bmrFor('male', age, weightKg, heightCm).kcal +
            bmrFor('female', age, weightKg, heightCm).kcal) /
          2,
        formula: bmrFor('male', age, weightKg, heightCm).formula,
      };
  const { factor, label } = activityFactor(hoursPerWeek);
  // Growing athletes always eat to maintain: no deficit or surplus under 18.
  const goal: Goal = age >= 18 ? input.goal : 'maintain';
  const goalKcal = GOALS.find((g) => g.id === goal)?.kcal ?? 0;
  const raw = bmr.kcal * factor + goalKcal;
  return {
    age,
    sex,
    formula: bmr.formula,
    bmr: Math.round(bmr.kcal),
    hoursPerWeek,
    factor,
    activity: label,
    goal,
    goalKcal,
    raw: Math.round(raw),
    level: nearestLevel(raw),
  };
}

export function validMetrics(
  heightCm: unknown,
  weightKg: unknown
): { heightCm: number; weightKg: number } | null {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!Number.isFinite(h) || h < HEIGHT_RANGE.min || h > HEIGHT_RANGE.max) return null;
  if (!Number.isFinite(w) || w < WEIGHT_RANGE.min || w > WEIGHT_RANGE.max) return null;
  return { heightCm: Math.round(h), weightKg: Math.round(w * 10) / 10 };
}

/** Which level a plan uses, in order: coach's fixed level, the recommendation, the plan's own level. */
export function resolveLevel(input: {
  fixedLevel: number | null;
  recommended: number | null;
  planLevel: number | null;
}): { level: number; source: 'fixed' | 'recommended' | 'plan' } | null {
  if (input.fixedLevel) return { level: input.fixedLevel, source: 'fixed' };
  if (input.recommended) return { level: input.recommended, source: 'recommended' };
  if (input.planLevel) return { level: input.planLevel, source: 'plan' };
  return null;
}
