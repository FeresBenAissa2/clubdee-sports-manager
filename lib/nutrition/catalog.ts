/**
 * Nutrition module — shared constants (safe to import from client and server).
 *
 * The module tracks habits, not calories: many athletes are minors, so we never
 * show calorie or weight targets. Feedback is about hydration, balanced plates
 * and how the athlete feels.
 */

export type FoodGroup = 'carbs' | 'protein' | 'veg' | 'fruit' | 'dairy' | 'treat';

export interface Food {
  id: string;
  name: string;
  emoji: string;
  groups: FoodGroup[];
}

export const FOOD_GROUP_LABEL: Record<FoodGroup, string> = {
  carbs: 'Energy (carbs)',
  protein: 'Protein',
  veg: 'Vegetables',
  fruit: 'Fruit',
  dairy: 'Dairy',
  treat: 'Treat / fried',
};

/** Everyday Tunisian food first, so athletes log what they actually eat. */
export const FOODS: Food[] = [
  { id: 'couscous', name: 'Couscous', emoji: '🍲', groups: ['carbs', 'protein', 'veg'] },
  { id: 'lablabi', name: 'Lablabi', emoji: '🥣', groups: ['protein', 'carbs'] },
  { id: 'ojja', name: 'Ojja', emoji: '🍳', groups: ['protein', 'veg'] },
  { id: 'chorba', name: 'Chorba frik', emoji: '🍜', groups: ['carbs', 'protein', 'veg'] },
  { id: 'makarouna', name: 'Makarouna', emoji: '🍝', groups: ['carbs'] },
  { id: 'riz-djerbi', name: 'Riz djerbi', emoji: '🍚', groups: ['carbs', 'protein', 'veg'] },
  { id: 'mloukhia', name: 'Mloukhia', emoji: '🥘', groups: ['protein'] },
  { id: 'adas', name: 'Lentils (3dess)', emoji: '🫘', groups: ['protein', 'carbs'] },
  { id: 'mechouia', name: 'Salade mechouia', emoji: '🫑', groups: ['veg'] },
  { id: 'salade-tunisienne', name: 'Salade tunisienne', emoji: '🥗', groups: ['veg'] },
  { id: 'grilled-fish', name: 'Grilled fish', emoji: '🐟', groups: ['protein'] },
  { id: 'grilled-chicken', name: 'Grilled chicken', emoji: '🍗', groups: ['protein'] },
  { id: 'eggs', name: 'Eggs', emoji: '🥚', groups: ['protein'] },
  { id: 'tabouna', name: 'Tabouna bread', emoji: '🫓', groups: ['carbs'] },
  { id: 'bsissa', name: 'Bsissa', emoji: '🥄', groups: ['carbs', 'protein'] },
  { id: 'rayeb', name: 'Rayeb / leben', emoji: '🥛', groups: ['dairy'] },
  { id: 'yogurt', name: 'Yogurt', emoji: '🍶', groups: ['dairy'] },
  { id: 'dates', name: 'Dates (deglet nour)', emoji: '🌴', groups: ['fruit', 'carbs'] },
  { id: 'fruit', name: 'Fresh fruit', emoji: '🍊', groups: ['fruit'] },
  { id: 'nuts', name: 'Almonds / nuts', emoji: '🥜', groups: ['protein'] },
  { id: 'brik', name: 'Brik', emoji: '🥟', groups: ['protein', 'treat'] },
  { id: 'kafteji', name: 'Kafteji', emoji: '🍆', groups: ['veg', 'treat'] },
  { id: 'fricasse', name: 'Fricassé', emoji: '🥪', groups: ['carbs', 'treat'] },
  { id: 'chapati', name: 'Chapati / fast food', emoji: '🌯', groups: ['carbs', 'treat'] },
  { id: 'sweets', name: 'Makroudh / baklawa', emoji: '🍯', groups: ['treat'] },
  { id: 'soda', name: 'Soft drink', emoji: '🥤', groups: ['treat'] },
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
