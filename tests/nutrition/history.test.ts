import { describe, expect, it } from 'vitest';
import { addMonths, lastDays, monthDays, monthOf, parseMonth } from '@/lib/nutrition/dates';
import { planSummary } from '@/lib/nutrition/plan';
import { nutritionFlags } from '@/lib/nutrition/tips';
import { weeklyTrend } from '@/lib/nutrition/trend';

describe('plan completion summary', () => {
  const days = lastDays('2026-11-16', 7); // 10 … 16 Nov
  const sixSteps = () => 6;

  it('is empty when the plan was never used', () => {
    expect(planSummary(days, sixSteps, new Map())).toEqual({ pct: 0, daysTracked: 0 });
  });

  it('starts on the first day with a tick', () => {
    // 3 of 6 today only: 50 %, not 3 out of 42.
    expect(planSummary(days, sixSteps, new Map([['2026-11-16', 3]]))).toEqual({
      pct: 50,
      daysTracked: 1,
    });
  });

  it('counts later days without ticks as zero', () => {
    const done = new Map([
      ['2026-11-14', 6],
      ['2026-11-16', 3],
    ]);
    expect(planSummary(days, sixSteps, done)).toEqual({ pct: 50, daysTracked: 3 }); // 9 / 18
  });

  it('never counts more ticks than planned steps', () => {
    expect(planSummary(days, () => 4, new Map([['2026-11-16', 9]])).pct).toBe(100);
  });
});

describe('coach flags', () => {
  const base = { staleBefore: '2026-11-14', hydrationPct: 80, hydrationDays: 5, checkIn: null };

  it('flags athletes who stopped logging', () => {
    expect(nutritionFlags({ ...base, lastLog: null })).toEqual(['not_logging']);
    expect(nutritionFlags({ ...base, lastLog: '2026-11-13' })).toEqual(['not_logging']);
    expect(nutritionFlags({ ...base, lastLog: '2026-11-14' })).toEqual([]);
  });

  it('waits for enough history before flagging low hydration', () => {
    expect(
      nutritionFlags({ ...base, lastLog: '2026-11-16', hydrationPct: 30, hydrationDays: 2 })
    ).toEqual([]);
    expect(
      nutritionFlags({ ...base, lastLog: '2026-11-16', hydrationPct: 30, hydrationDays: 3 })
    ).toEqual(['low_hydration']);
  });

  it('flags low energy from the weekly check-in', () => {
    const tired = { energy: 2, sleep: 4, appetite: 4, legs: 4 };
    const flat = { energy: 3, sleep: 2, appetite: 3, legs: 2 };
    const fine = { energy: 4, sleep: 3, appetite: 4, legs: 3 };
    expect(nutritionFlags({ ...base, lastLog: '2026-11-16', checkIn: tired })).toEqual([
      'low_energy',
    ]);
    expect(nutritionFlags({ ...base, lastLog: '2026-11-16', checkIn: flat })).toEqual([
      'low_energy',
    ]);
    expect(nutritionFlags({ ...base, lastLog: '2026-11-16', checkIn: fine })).toEqual([]);
  });
});

describe('month navigation', () => {
  it('moves across year boundaries', () => {
    expect(addMonths('2026-11', -4)).toBe('2026-07');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2025-12', 1)).toBe('2026-01');
  });

  it('lists a month and stops at today', () => {
    expect(monthDays('2026-02', '2026-11-16')).toHaveLength(28);
    expect(monthDays('2026-11', '2026-11-16')).toHaveLength(16);
    expect(monthDays('2026-11', '2026-11-16').at(-1)).toBe('2026-11-16');
    expect(monthDays('2026-12', '2026-11-16')).toEqual([]);
    expect(monthOf('2026-11-16')).toBe('2026-11');
  });

  it('only accepts real months inside the allowed range', () => {
    expect(parseMonth('2026-07', '2025-12', '2026-11')).toBe('2026-07');
    expect(parseMonth(undefined, '2025-12', '2026-11')).toBe('2026-11');
    expect(parseMonth('2026-13', '2025-12', '2026-11')).toBe('2026-11');
    expect(parseMonth('2027-01', '2025-12', '2026-11')).toBe('2026-11');
    expect(parseMonth('2020-05', '2025-12', '2026-11')).toBe('2025-12');
    expect(parseMonth(['2026-07'], '2025-12', '2026-11')).toBe('2026-11');
  });
});

describe('weekly trend', () => {
  const day = (date: string, steps: number, done: number, glasses: number, training = false) => ({
    date,
    steps: Array.from({ length: steps }, (_, i) => ({ id: `s${i}` })),
    done: Array.from({ length: done }, (_, i) => `s${i}`),
    glasses,
    goal: 8,
    meals: [],
    sessions: training ? [{}] : [],
  });

  it('groups days into Monday weeks', () => {
    const trend = weeklyTrend([
      day('2026-11-08', 4, 2, 8), // Sunday: week of 2 Nov
      day('2026-11-09', 6, 6, 4, true), // Monday
      day('2026-11-10', 4, 0, 0),
    ]);
    expect(trend.map((w) => w.week)).toEqual(['2026-11-02', '2026-11-09']);
    expect(trend[0]).toMatchObject({ planPct: 50, waterPct: 100, trainingDays: 0 });
    // 6 of 10 steps; water (50 % + 0 %) / 2 days.
    expect(trend[1]).toMatchObject({ planPct: 60, waterPct: 25, trainingDays: 1 });
  });

  it('leaves weeks without use empty rather than zero', () => {
    expect(weeklyTrend([day('2026-11-09', 6, 0, 0)])[0]).toMatchObject({
      planPct: null,
      waterPct: null,
    });
  });
});
