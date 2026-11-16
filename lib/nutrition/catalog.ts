/**
 * Nutrition module — shared constants (safe to import from client and server).
 *
 * Athletes are tracked on habits (water, balanced plates, how they feel). Calorie
 * numbers exist for the coach's meal plans; athletes under 18 never see them, only
 * portions in grams and household measures (see lib/nutrition/portions.ts).
 */

export type FoodGroup = 'carbs' | 'protein' | 'veg' | 'fruit' | 'dairy' | 'treat';

/** Approximate values per 100 g (public food-composition tables, typical home recipes). */
export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Measure {
  /** Singular household unit, e.g. "egg", "bowl". */
  label: string;
  grams: number;
  /** Eaten in whole units (eggs, dates): portions are rounded to whole units. */
  countable?: boolean;
}

export interface Food {
  id: string;
  name: string;
  emoji: string;
  groups: FoodGroup[];
  per100: Nutrients;
  measure: Measure;
}

const n = (kcal: number, protein: number, carbs: number, fat: number): Nutrients => ({
  kcal,
  protein,
  carbs,
  fat,
});

export const FOOD_GROUP_LABEL: Record<FoodGroup, string> = {
  carbs: 'Energy (carbs)',
  protein: 'Protein',
  veg: 'Vegetables',
  fruit: 'Fruit',
  dairy: 'Dairy',
  treat: 'Treat / fried',
};

/** Everyday Tunisian food first, so athletes log what they actually eat. */
// prettier-ignore
export const FOODS: Food[] = [
  { id: 'couscous', name: 'Couscous', emoji: '🍲', groups: ['carbs', 'protein', 'veg'], per100: n(150, 7, 20, 4.5), measure: { label: 'plate', grams: 350 } },
  { id: 'lablabi', name: 'Lablabi', emoji: '🥣', groups: ['protein', 'carbs'], per100: n(120, 6, 17, 3), measure: { label: 'bowl', grams: 350 } },
  { id: 'ojja', name: 'Ojja', emoji: '🍳', groups: ['protein', 'veg'], per100: n(120, 7, 5, 8), measure: { label: 'portion', grams: 200 } },
  { id: 'chorba', name: 'Chorba frik', emoji: '🍜', groups: ['carbs', 'protein', 'veg'], per100: n(65, 4, 8, 2), measure: { label: 'bowl', grams: 300 } },
  { id: 'makarouna', name: 'Makarouna', emoji: '🍝', groups: ['carbs'], per100: n(155, 6, 23, 4.5), measure: { label: 'plate', grams: 300 } },
  { id: 'riz-djerbi', name: 'Riz djerbi', emoji: '🍚', groups: ['carbs', 'protein', 'veg'], per100: n(150, 7, 20, 4.5), measure: { label: 'plate', grams: 300 } },
  { id: 'rice', name: 'Rice (cooked)', emoji: '🍚', groups: ['carbs'], per100: n(130, 2.7, 28, 0.3), measure: { label: 'plate', grams: 200 } },
  { id: 'pasta', name: 'Pasta (cooked)', emoji: '🍝', groups: ['carbs'], per100: n(158, 5.8, 31, 0.9), measure: { label: 'plate', grams: 200 } },
  { id: 'mloukhia', name: 'Mloukhia', emoji: '🥘', groups: ['protein'], per100: n(140, 9, 4, 10), measure: { label: 'bowl', grams: 250 } },
  { id: 'adas', name: 'Lentils (3dess)', emoji: '🫘', groups: ['protein', 'carbs'], per100: n(110, 7, 16, 2), measure: { label: 'bowl', grams: 300 } },
  { id: 'mechouia', name: 'Salade mechouia', emoji: '🫑', groups: ['veg'], per100: n(75, 1.5, 6, 5), measure: { label: 'side dish', grams: 100 } },
  { id: 'salade-tunisienne', name: 'Salade tunisienne', emoji: '🥗', groups: ['veg'], per100: n(70, 3, 5, 4.5), measure: { label: 'side dish', grams: 150 } },
  { id: 'grilled-fish', name: 'Grilled fish', emoji: '🐟', groups: ['protein'], per100: n(130, 22, 0, 4.5), measure: { label: 'fillet', grams: 150 } },
  { id: 'grilled-chicken', name: 'Grilled chicken', emoji: '🍗', groups: ['protein'], per100: n(165, 31, 0, 3.6), measure: { label: 'piece', grams: 120 } },
  { id: 'eggs', name: 'Eggs', emoji: '🥚', groups: ['protein'], per100: n(143, 12.6, 0.7, 9.5), measure: { label: 'egg', grams: 50, countable: true } },
  { id: 'tabouna', name: 'Tabouna bread', emoji: '🫓', groups: ['carbs'], per100: n(270, 8.5, 52, 2.5), measure: { label: 'quarter loaf', grams: 60 } },
  { id: 'bsissa', name: 'Bsissa', emoji: '🥄', groups: ['carbs', 'protein'], per100: n(420, 15, 55, 14), measure: { label: 'tablespoon', grams: 10 } },
  { id: 'rayeb', name: 'Rayeb / leben', emoji: '🥛', groups: ['dairy'], per100: n(60, 3.3, 4.5, 3), measure: { label: 'glass', grams: 250 } },
  { id: 'milk', name: 'Milk', emoji: '🥛', groups: ['dairy'], per100: n(61, 3.2, 4.8, 3.3), measure: { label: 'glass', grams: 250 } },
  { id: 'yogurt', name: 'Yogurt', emoji: '🍶', groups: ['dairy'], per100: n(65, 3.8, 5, 3.2), measure: { label: 'pot', grams: 125 } },
  { id: 'dates', name: 'Dates (deglet nour)', emoji: '🌴', groups: ['fruit', 'carbs'], per100: n(282, 2.5, 75, 0.4), measure: { label: 'date', grams: 8, countable: true } },
  { id: 'fruit', name: 'Fresh fruit', emoji: '🍊', groups: ['fruit'], per100: n(50, 0.8, 12, 0.2), measure: { label: 'piece', grams: 150, countable: true } },
  { id: 'banana', name: 'Banana', emoji: '🍌', groups: ['fruit', 'carbs'], per100: n(89, 1.1, 23, 0.3), measure: { label: 'banana', grams: 120, countable: true } },
  { id: 'nuts', name: 'Almonds / nuts', emoji: '🥜', groups: ['protein'], per100: n(580, 21, 22, 50), measure: { label: 'handful', grams: 25 } },
  { id: 'brik', name: 'Brik', emoji: '🥟', groups: ['protein', 'treat'], per100: n(250, 9, 18, 16), measure: { label: 'brik', grams: 120, countable: true } },
  { id: 'kafteji', name: 'Kafteji', emoji: '🍆', groups: ['veg', 'treat'], per100: n(180, 5, 10, 13), measure: { label: 'plate', grams: 200 } },
  { id: 'fricasse', name: 'Fricassé', emoji: '🥪', groups: ['carbs', 'treat'], per100: n(300, 9, 33, 15), measure: { label: 'fricassé', grams: 120, countable: true } },
  { id: 'chapati', name: 'Chapati / fast food', emoji: '🌯', groups: ['carbs', 'treat'], per100: n(250, 10, 28, 11), measure: { label: 'sandwich', grams: 250 } },
  { id: 'sweets', name: 'Makroudh / baklawa', emoji: '🍯', groups: ['treat'], per100: n(400, 5, 60, 16), measure: { label: 'piece', grams: 40, countable: true } },
  { id: 'soda', name: 'Soft drink', emoji: '🥤', groups: ['treat'], per100: n(42, 0, 10.6, 0), measure: { label: 'can', grams: 330 } },
];

export const FOOD_BY_ID = new Map(FOODS.map((f) => [f.id, f]));

export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
  { id: 'snack', label: 'Snack', emoji: '🍎' },
  { id: 'pre_training', label: 'Before training', emoji: '⚡' },
  { id: 'post_training', label: 'After training', emoji: '🔋' },
] as const;

export type MealType = (typeof MEAL_TYPES)[number]['id'];

export const MEAL_TYPE_IDS = new Set<string>(MEAL_TYPES.map((m) => m.id));

/** Short, friendly feedback on a plate. Never judges, always suggests. */
export function plateFeedback(itemIds: string[]): { balanced: boolean; hint: string } {
  const groups = new Set<FoodGroup>();
  for (const id of itemIds) FOOD_BY_ID.get(id)?.groups.forEach((g) => groups.add(g));
  const hasCarbs = groups.has('carbs');
  const hasProtein = groups.has('protein');
  const hasPlants = groups.has('veg') || groups.has('fruit');

  if (hasCarbs && hasProtein && hasPlants) return { balanced: true, hint: 'Balanced plate' };
  if (!hasProtein) return { balanced: false, hint: 'Add some protein' };
  if (!hasPlants) return { balanced: false, hint: 'Add veggies or fruit' };
  return { balanced: false, hint: 'Add an energy source' };
}

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

/** One glass ≈ 250 ml. */
export const GLASS_ML = 250;
export const BASE_GLASS_GOAL = 8;
/** Extra glasses on a day with a training session. */
export const TRAINING_DAY_BONUS = 2;
export const MAX_GLASSES = 24;

// ---------------------------------------------------------------------------
// Weekly check-in (all scales: 1 = bad, 5 = great)
// ---------------------------------------------------------------------------

export const CHECKIN_FIELDS = [
  { id: 'energy', label: 'Energy', faces: ['😫', '😕', '😐', '🙂', '⚡'] },
  { id: 'sleep', label: 'Sleep', faces: ['😵', '🥱', '😐', '😌', '😴'] },
  { id: 'appetite', label: 'Appetite', faces: ['🚫', '😕', '😐', '🙂', '😋'] },
  { id: 'legs', label: 'Legs feel', faces: ['🧱', '🪨', '😐', '👟', '🚀'] },
] as const;

export type CheckInField = (typeof CHECKIN_FIELDS)[number]['id'];
export type CheckInScores = Record<CheckInField, number>;

export const NOTE_MAX = 200;
