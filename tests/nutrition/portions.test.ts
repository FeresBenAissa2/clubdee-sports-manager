import { describe, expect, it } from 'vitest';
import { FOODS } from '@/lib/nutrition/catalog';
import { buildFuelPlan, type PlanSession } from '@/lib/nutrition/plan';
import {
  cleanMeal,
  dayNutrients,
  generateMeal,
  isAdult,
  macroSplit,
  measureText,
  PLAN_LEVELS,
  PLAN_STYLES,
  portionsForSteps,
  REFERENCE_MEALS,
  roundGrams,
  sumNutrients,
} from '@/lib/nutrition/portions';

const session = (id: string, start: string, end: string): PlanSession => ({
  id,
  title: id,
  start_time: start,
  end_time: end,
});

const SCHEDULES: Record<string, PlanSession[]> = {
  rest: [],
  afternoon: [session('a', '17:30:00', '19:00:00')],
  earlySwim: [session('b', '06:30:00', '07:30:00')],
  late: [session('c', '21:00:00', '22:30:00')],
  twoDistant: [session('d', '09:00:00', '10:30:00'), session('e', '16:00:00', '17:30:00')],
  twoClose: [session('f', '08:00:00', '09:30:00'), session('g', '11:00:00', '12:30:00')],
};

describe('food values', () => {
  it('has nutrition values and a measure for every food', () => {
    for (const food of FOODS) {
      expect(food.per100.kcal, food.id).toBeGreaterThan(0);
      expect(food.measure.grams, food.id).toBeGreaterThan(0);
      // Energy from macros roughly matches the stated kcal (within 20 %).
      const fromMacros = food.per100.protein * 4 + food.per100.carbs * 4 + food.per100.fat * 9;
      expect(Math.abs(fromMacros - food.per100.kcal) / food.per100.kcal, food.id).toBeLessThan(0.2);
    }
  });

  it('only uses catalog foods in reference meals', () => {
    const ids = new Set(FOODS.map((f) => f.id));
    for (const items of Object.values(REFERENCE_MEALS)) {
      for (const item of items) expect(ids.has(item.food_id), item.food_id).toBe(true);
    }
  });
});

describe('generated plans', () => {
  it('hit the chosen level within 5 % for every style and schedule', () => {
    for (const level of PLAN_LEVELS) {
      for (const { id: style } of PLAN_STYLES) {
        for (const [name, sessions] of Object.entries(SCHEDULES)) {
          const portions = portionsForSteps(buildFuelPlan(sessions), {
            level_kcal: level,
            style,
            meals: {},
          });
          const total = dayNutrients(portions).kcal;
          expect(Math.abs(total - level) / level, `${level} ${style} ${name}`).toBeLessThan(0.05);
        }
      }
    }
  });

  it('gives every meal step a portion and none to water during training', () => {
    const steps = buildFuelPlan(SCHEDULES.afternoon);
    const portions = portionsForSteps(steps, { level_kcal: 2500, style: 'balanced', meals: {} });
    expect(portions.has('during:a')).toBe(false);
    for (const step of steps.filter((s) => s.kind !== 'during')) {
      expect(portions.get(step.id)?.length, step.id).toBeGreaterThan(0);
    }
  });

  it('tilts towards carbs for endurance and protein for strength', () => {
    // Dinner mixes a protein food (fish) and a carb food (rice), so the tilt shows.
    const endurance = macroSplit(sumNutrients(generateMeal('dinner', 800, 'endurance')));
    const strength = macroSplit(sumNutrients(generateMeal('dinner', 800, 'strength')));
    expect(endurance.carbs).toBeGreaterThan(strength.carbs);
    expect(strength.protein).toBeGreaterThan(endurance.protein);
  });

  it('uses the coach’s meals exactly as written', () => {
    const custom = [
      { food_id: 'rice', grams: 180 },
      { food_id: 'grilled-chicken', grams: 150 },
    ];
    const portions = portionsForSteps(buildFuelPlan([]), {
      level_kcal: 2500,
      style: 'balanced',
      meals: { lunch: custom },
    });
    expect(portions.get('lunch')).toEqual(custom);
  });
});

describe('servable amounts', () => {
  it('rounds weighed foods to 5 g and counted foods to whole units', () => {
    expect(roundGrams('rice', 182)).toBe(180);
    expect(roundGrams('rice', 1)).toBe(5);
    expect(roundGrams('eggs', 80)).toBe(100); // 2 eggs
    expect(roundGrams('dates', 3)).toBe(8); // at least 1 date
  });

  it('describes portions in household measures', () => {
    expect(measureText('eggs', 100)).toBe('2 eggs');
    expect(measureText('dates', 8)).toBe('1 date');
    expect(measureText('couscous', 350)).toBe('≈ 1 plate');
    expect(measureText('couscous', 525)).toBe('≈ 1½ plates');
    expect(measureText('rayeb', 125)).toBe('≈ ½ glass');
  });
});

describe('age rule', () => {
  it('counts 18 years from the birth date', () => {
    expect(isAdult('2008-11-16', '2026-11-16')).toBe(true);
    expect(isAdult('2008-11-17', '2026-11-16')).toBe(false);
    expect(isAdult('2008-11-16T00:00:00.000Z', '2026-11-16')).toBe(true);
    expect(isAdult(new Date('1990-05-01T00:00:00Z'), '2026-11-16')).toBe(true);
  });

  it('treats a missing or invalid birth date as a minor', () => {
    expect(isAdult(null, '2026-11-16')).toBe(false);
    expect(isAdult('', '2026-11-16')).toBe(false);
    expect(isAdult('not a date', '2026-11-16')).toBe(false);
  });
});

describe('meals sent by a coach', () => {
  it('accepts catalog foods with sensible grams', () => {
    expect(cleanMeal([{ food_id: 'rice', grams: 200.4 }])).toEqual([
      { food_id: 'rice', grams: 200 },
    ]);
    expect(cleanMeal([])).toEqual([]);
  });

  it('rejects unknown foods, odd amounts and long lists', () => {
    expect(cleanMeal([{ food_id: 'pizza', grams: 200 }])).toBeNull();
    expect(cleanMeal([{ food_id: 'rice', grams: 2 }])).toBeNull();
    expect(cleanMeal([{ food_id: 'rice', grams: 5000 }])).toBeNull();
    expect(cleanMeal(Array.from({ length: 9 }, () => ({ food_id: 'rice', grams: 50 })))).toBeNull();
    expect(cleanMeal('rice')).toBeNull();
  });
});
