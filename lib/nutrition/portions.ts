/**
 * Nutrition module — meal plans with portions (pure, safe to import from client and server).
 *
 * A coach picks a calorie level and a style for a team or an athlete. Each meal step of
 * the day's fuel plan (lib/nutrition/plan.ts) then gets a portion list in grams:
 * - the day's level is split between the meal steps that day actually has, so the total
 *   matches the level whatever the training schedule;
 * - each step's reference meal is scaled to its share and rounded to sensible amounts;
 * - a coach can replace any meal with exact items, used as they are.
 *
 * Values are approximate. Athletes under 18 never see calorie numbers (`isAdult`).
 */
import { FOOD_BY_ID, type Nutrients } from './catalog';
import type { FuelStep, StepKind } from './plan';

export type MealKind = Exclude<StepKind, 'during'>;
export type PlanStyle = 'balanced' | 'endurance' | 'strength';

export interface PortionItem {
  food_id: string;
  grams: number;
}

export interface MealPlanConfig {
  level_kcal: number;
  style: PlanStyle;
  /** Meals the coach set by hand, used verbatim. Missing kinds are generated. */
  meals: Partial<Record<MealKind, PortionItem[]>>;
}

/** Daily energy levels a plan can use: 1,500 to 4,500 kcal in steps of 250. */
export const PLAN_LEVELS: readonly number[] = Array.from({ length: 13 }, (_, i) => 1500 + i * 250);

export const PLAN_STYLES: { id: PlanStyle; label: string; description: string }[] = [
  { id: 'balanced', label: 'Balanced', description: 'Even mix of energy and protein.' },
  {
    id: 'endurance',
    label: 'Endurance',
    description: 'More carbs for long sessions (swimming, running).',
  },
  { id: 'strength', label: 'Strength', description: 'More protein for power and contact sports.' },
];

/** Meal kinds in the order a coach edits them. */
export const MEAL_KINDS: { kind: MealKind; label: string; training: boolean; rest: boolean }[] = [
  { kind: 'breakfast', label: 'Breakfast', training: true, rest: true },
  { kind: 'lunch', label: 'Lunch', training: true, rest: true },
  { kind: 'pre_meal', label: 'Energy meal (2–3 h before training)', training: true, rest: false },
  { kind: 'pre_snack', label: 'Pre-training snack', training: true, rest: false },
  { kind: 'recovery', label: 'Recovery meal', training: true, rest: false },
  { kind: 'refuel', label: 'Refuel between sessions', training: true, rest: false },
  { kind: 'snack', label: 'Afternoon snack (rest day)', training: false, rest: true },
  { kind: 'dinner', label: 'Dinner', training: true, rest: true },
];
export const MEAL_KIND_IDS = new Set<string>(MEAL_KINDS.map((m) => m.kind));

/** Starting point for every meal, Tunisian-first. Scaled to the level before use. */
export const REFERENCE_MEALS: Record<MealKind, PortionItem[]> = {
  breakfast: [
    { food_id: 'bsissa', grams: 40 },
    { food_id: 'milk', grams: 250 },
    { food_id: 'dates', grams: 24 },
    { food_id: 'eggs', grams: 50 },
  ],
  lunch: [
    { food_id: 'couscous', grams: 350 },
    { food_id: 'salade-tunisienne', grams: 150 },
    { food_id: 'fruit', grams: 150 },
  ],
  pre_meal: [
    { food_id: 'makarouna', grams: 300 },
    { food_id: 'salade-tunisienne', grams: 100 },
  ],
  pre_snack: [
    { food_id: 'dates', grams: 32 },
    { food_id: 'banana', grams: 120 },
  ],
  recovery: [
    { food_id: 'lablabi', grams: 350 },
    { food_id: 'tabouna', grams: 60 },
    { food_id: 'rayeb', grams: 250 },
  ],
  refuel: [
    { food_id: 'rayeb', grams: 250 },
    { food_id: 'dates', grams: 32 },
    { food_id: 'tabouna', grams: 60 },
  ],
  snack: [
    { food_id: 'yogurt', grams: 125 },
    { food_id: 'nuts', grams: 25 },
    { food_id: 'fruit', grams: 150 },
  ],
  dinner: [
    { food_id: 'grilled-fish', grams: 150 },
    { food_id: 'rice', grams: 200 },
    { food_id: 'mechouia', grams: 100 },
    { food_id: 'fruit', grams: 150 },
  ],
};

/** Relative weight of each meal in the day; normalised over the meals a day has. */
export const MEAL_SHARE: Record<MealKind, number> = {
  breakfast: 22,
  lunch: 28,
  pre_meal: 22,
  pre_snack: 8,
  recovery: 20,
  refuel: 12,
  snack: 10,
  dinner: 25,
};

const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function itemNutrients({ food_id, grams }: PortionItem): Nutrients {
  const food = FOOD_BY_ID.get(food_id);
  if (!food) return ZERO;
  const f = grams / 100;
  return {
    kcal: food.per100.kcal * f,
    protein: food.per100.protein * f,
    carbs: food.per100.carbs * f,
    fat: food.per100.fat * f,
  };
}

export function sumNutrients(items: PortionItem[]): Nutrients {
  return items.reduce((sum, item) => {
    const v = itemNutrients(item);
    return {
      kcal: sum.kcal + v.kcal,
      protein: sum.protein + v.protein,
      carbs: sum.carbs + v.carbs,
      fat: sum.fat + v.fat,
    };
  }, ZERO);
}

/** Rounds to what someone can actually serve: whole units for countable foods, else 5 g. */
export function roundGrams(foodId: string, grams: number): number {
  const measure = FOOD_BY_ID.get(foodId)?.measure;
  if (measure?.countable) return Math.max(1, Math.round(grams / measure.grams)) * measure.grams;
  return Math.max(5, Math.round(grams / 5) * 5);
}

type Lean = 'carb' | 'protein' | 'neutral';
function lean(foodId: string): Lean {
  const v = FOOD_BY_ID.get(foodId)?.per100;
  if (!v || v.kcal === 0) return 'neutral';
  if ((v.protein * 4) / v.kcal >= 0.25) return 'protein';
  if ((v.carbs * 4) / v.kcal >= 0.5) return 'carb';
  return 'neutral';
}

const TILT: Record<PlanStyle, Record<Lean, number>> = {
  balanced: { carb: 1, protein: 1, neutral: 1 },
  endurance: { carb: 1.15, protein: 0.9, neutral: 1 },
  strength: { carb: 0.9, protein: 1.2, neutral: 1 },
};

/** A reference meal tilted by style and scaled to `kcal`, rounded to servable amounts. */
export function generateMeal(kind: MealKind, kcal: number, style: PlanStyle): PortionItem[] {
  const tilted = REFERENCE_MEALS[kind].map((item) => ({
    food_id: item.food_id,
    grams: item.grams * TILT[style][lean(item.food_id)],
  }));
  const base = sumNutrients(tilted).kcal;
  if (base <= 0 || kcal <= 0) return [];
  const factor = kcal / base;
  const items = tilted.map((item) => ({
    food_id: item.food_id,
    grams: roundGrams(item.food_id, item.grams * factor),
  }));

  // Rounding drifts; absorb the gap in the largest item that is weighed, not counted.
  const flexible = items
    .filter((item) => !FOOD_BY_ID.get(item.food_id)?.measure.countable)
    .sort((a, b) => itemNutrients(b).kcal - itemNutrients(a).kcal)[0];
  if (flexible) {
    const gap = kcal - sumNutrients(items).kcal;
    const perGram = (FOOD_BY_ID.get(flexible.food_id)?.per100.kcal ?? 0) / 100;
    if (perGram > 0) flexible.grams = roundGrams(flexible.food_id, flexible.grams + gap / perGram);
  }
  return items;
}

const isMealKind = (kind: StepKind): kind is MealKind => kind !== 'during';

/** Portions for each meal step of a day (`steps` from buildFuelPlan), keyed by step id. */
export function portionsForSteps(
  steps: FuelStep[],
  plan: MealPlanConfig
): Map<string, PortionItem[]> {
  const meals = steps.filter((s) => isMealKind(s.kind));
  const totalShare = meals.reduce((sum, s) => sum + MEAL_SHARE[s.kind as MealKind], 0);
  const out = new Map<string, PortionItem[]>();
  const generated: PortionItem[] = [];
  let generatedTarget = 0;
  for (const step of meals) {
    const kind = step.kind as MealKind;
    const custom = plan.meals[kind];
    if (custom && custom.length > 0) {
      out.set(step.id, custom);
      continue;
    }
    const kcal = (plan.level_kcal * MEAL_SHARE[kind]) / totalShare;
    // Copies, so the day-level correction below never touches shared objects.
    const items = generateMeal(kind, kcal, plan.style).map((item) => ({ ...item }));
    out.set(step.id, items);
    generated.push(...items);
    generatedTarget += kcal;
  }

  // Small meals of counted foods (a banana, two dates) cannot be trimmed, so the day can
  // drift; settle the difference on the largest weighed item of the generated meals.
  const flexible = generated
    .filter((item) => !FOOD_BY_ID.get(item.food_id)?.measure.countable)
    .sort((a, b) => itemNutrients(b).kcal - itemNutrients(a).kcal)[0];
  if (flexible) {
    const gap = generatedTarget - sumNutrients(generated).kcal;
    const perGram = (FOOD_BY_ID.get(flexible.food_id)?.per100.kcal ?? 0) / 100;
    if (perGram > 0) flexible.grams = roundGrams(flexible.food_id, flexible.grams + gap / perGram);
  }
  return out;
}

/** Day total of all portions. */
export function dayNutrients(portions: Map<string, PortionItem[]>): Nutrients {
  return sumNutrients([...portions.values()].flat());
}

/** Share of energy from protein, carbs and fat (0–100, rounded). */
export function macroSplit(v: Nutrients): { protein: number; carbs: number; fat: number } {
  const total = v.protein * 4 + v.carbs * 4 + v.fat * 9;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round(((v.protein * 4) / total) * 100),
    carbs: Math.round(((v.carbs * 4) / total) * 100),
    fat: Math.round(((v.fat * 9) / total) * 100),
  };
}

const plural = (label: string, count: number) =>
  count === 1 ? label : label.endsWith('s') ? label : `${label}s`;

/** Household equivalent: "2 eggs", "≈ 1½ plates". */
export function measureText(foodId: string, grams: number): string {
  const measure = FOOD_BY_ID.get(foodId)?.measure;
  if (!measure) return '';
  const ratio = grams / measure.grams;
  if (measure.countable) {
    const units = Math.round(ratio);
    return `${units} ${plural(measure.label, units)}`;
  }
  const halves = Math.round(ratio * 2);
  if (halves === 0) return `a little (${plural(measure.label, 1)} = ${measure.grams} g)`;
  const whole = Math.floor(halves / 2);
  const text = `${whole > 0 ? whole : ''}${halves % 2 ? '½' : ''}`;
  return `≈ ${text} ${plural(measure.label, halves / 2 > 1 ? 2 : 1)}`;
}

/** 18 or older on `today` (`YYYY-MM-DD`). Unknown or invalid birth date counts as a minor. */
export function isAdult(dateOfBirth: unknown, today: string): boolean {
  const raw =
    dateOfBirth instanceof Date
      ? dateOfBirth.toISOString()
      : typeof dateOfBirth === 'string'
        ? dateOfBirth
        : '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return false;
  const eighteenth = `${Number(match[1]) + 18}-${match[2]}-${match[3]}`;
  return today >= eighteenth;
}

/** Checks a meal list coming from the browser; returns null when it is not acceptable. */
export function cleanMeal(items: unknown): PortionItem[] | null {
  if (!Array.isArray(items) || items.length > 8) return null;
  const out: PortionItem[] = [];
  for (const item of items) {
    const foodId = (item as PortionItem)?.food_id;
    const grams = Number((item as PortionItem)?.grams);
    if (typeof foodId !== 'string' || !FOOD_BY_ID.has(foodId)) return null;
    if (!Number.isFinite(grams) || grams < 5 || grams > 1000) return null;
    out.push({ food_id: foodId, grams: Math.round(grams) });
  }
  return out;
}
