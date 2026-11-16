import { describe, expect, it } from 'vitest';
import { BASE_GLASS_GOAL, FOODS, TRAINING_DAY_BONUS, plateFeedback } from '@/lib/nutrition/catalog';
import { addDays, dayKey, lastDays, weekStart } from '@/lib/nutrition/dates';
import { hydrationGoal, hydrationSummary, MIN_DAYS_FOR_HYDRATION_FLAG, trainingTip } from '@/lib/nutrition/tips';

describe('nutrition dates', () => {
  it('uses the club calendar day, not UTC', () => {
    // 23:30 UTC is already the next day in Tunis (UTC+1).
    expect(dayKey(new Date('2026-03-10T23:30:00Z'), 'Africa/Tunis')).toBe('2026-03-11');
    expect(dayKey(new Date('2026-03-10T12:00:00Z'), 'Africa/Tunis')).toBe('2026-03-10');
    expect(dayKey(new Date('2026-03-10T23:30:00Z'), 'UTC')).toBe('2026-03-10');
  });

  it('moves across month and year boundaries', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('finds the Monday of a week', () => {
    expect(weekStart('2026-11-11')).toBe('2026-11-09'); // Wednesday
    expect(weekStart('2026-11-09')).toBe('2026-11-09'); // Monday
    expect(weekStart('2026-11-15')).toBe('2026-11-09'); // Sunday
  });

  it('lists the last days oldest first, ending today', () => {
    const days = lastDays('2026-11-11', 7);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-11-05');
    expect(days[6]).toBe('2026-11-11');
  });
});

describe('plate feedback', () => {
  it('calls a plate balanced when it has energy, protein and plants', () => {
    expect(plateFeedback(['couscous']).balanced).toBe(true);
    expect(plateFeedback(['makarouna', 'grilled-chicken', 'mechouia']).balanced).toBe(true);
  });

  it('suggests what is missing', () => {
    expect(plateFeedback(['makarouna'])).toEqual({ balanced: false, hint: 'Add some protein' });
    expect(plateFeedback(['lablabi'])).toEqual({ balanced: false, hint: 'Add veggies or fruit' });
    expect(plateFeedback(['ojja'])).toEqual({ balanced: false, hint: 'Add an energy source' });
  });

  it('ignores unknown dishes', () => {
    expect(plateFeedback(['not-a-dish']).balanced).toBe(false);
  });

  it('has unique food ids', () => {
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
  });
});

describe('hydration summary for coaches', () => {
  const days = lastDays('2026-11-11', 7); // 5 Nov … 11 Nov

  it('is empty when nothing was logged', () => {
    expect(hydrationSummary(days, [])).toEqual({ pct: 0, daysTracked: 0 });
    expect(hydrationSummary(days, [{ date: '2026-11-11', glasses: 0, goal: 8 }])).toEqual({ pct: 0, daysTracked: 0 });
  });

  it('measures a new athlete from their first log, not over the whole week', () => {
    // 2 of 8 glasses on the first day of logging: 25 %, not 4 % (2/8 spread over 7 days).
    expect(hydrationSummary(days, [{ date: '2026-11-11', glasses: 2, goal: 8 }])).toEqual({ pct: 25, daysTracked: 1 });
  });

  it('counts days skipped after the first log as zero', () => {
    const summary = hydrationSummary(days, [
      { date: '2026-11-09', glasses: 8, goal: 8 },
      { date: '2026-11-11', glasses: 4, goal: 8 },
    ]);
    expect(summary).toEqual({ pct: 50, daysTracked: 3 }); // (100 + 0 + 50) / 3
  });

  it('never counts more than the goal', () => {
    expect(hydrationSummary(days, [{ date: '2026-11-11', glasses: 20, goal: 10 }]).pct).toBe(100);
  });

  it('only warns once there is enough history', () => {
    expect(MIN_DAYS_FOR_HYDRATION_FLAG).toBeGreaterThanOrEqual(2);
  });
});

describe('training awareness', () => {
  const session = { title: 'Evening practice', start_time: '18:00:00', end_time: '19:30:00' };

  it('raises the water goal on training days only', () => {
    expect(hydrationGoal(0)).toBe(BASE_GLASS_GOAL);
    expect(hydrationGoal(2)).toBe(BASE_GLASS_GOAL + TRAINING_DAY_BONUS);
  });

  it('adapts the tip to the time of day', () => {
    expect(trainingTip([], '10:00:00').title).toBe('Rest day');
    expect(trainingTip([session], '10:00:00').title).toBe('Training at 18:00');
    expect(trainingTip([session], '18:30:00').title).toBe('Training in progress');
    expect(trainingTip([session], '20:00:00').title).toBe('Recovery time');
  });
});
