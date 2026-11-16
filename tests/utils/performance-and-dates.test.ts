import { describe, expect, it } from 'vitest';
import { localDateKey } from '@/lib/utils/local-date';
import { bestScore, betterScore, improvementOf, lowerIsBetter } from '@/lib/utils/performance';

describe('localDateKey', () => {
  it('formats the local calendar day with leading zeros', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 10, 12, 0, 0))).toBe('2026-11-12');
  });

  it('gives the local day at local midnight (toISOString would give the previous day east of UTC)', () => {
    const midnight = new Date(2026, 10, 11);
    midnight.setHours(0, 0, 0, 0);
    expect(localDateKey(midnight)).toBe('2026-11-11');
  });
});

describe('timed tests are lower-is-better', () => {
  it('recognises time units', () => {
    for (const unit of ['Seconds', 'seconds', 'Minutes', 'sec', ' min ']) expect(lowerIsBetter(unit)).toBe(true);
    for (const unit of ['Reps', 'Meters', 'Kilograms (kg)', 'Points', '', null, undefined]) {
      expect(lowerIsBetter(unit)).toBe(false);
    }
  });

  it('picks the best score for the unit', () => {
    expect(bestScore([31.5, 30.2], 'Seconds')).toBe(30.2);
    expect(bestScore([40, 42], 'Reps')).toBe(42);
    expect(betterScore(31.5, 30.2, 'Seconds')).toBe(30.2);
    expect(betterScore(40, 42, 'Reps')).toBe(42);
  });

  it('reports a faster time as an improvement', () => {
    const faster = improvementOf(31.5, 30.2, 'Seconds');
    expect(faster.improved).toBe(true);
    expect(faster.change).toBeCloseTo(-1.3);
    expect(faster.percentage).toBeCloseTo(4.13, 1);

    const slower = improvementOf(30.2, 31.5, 'Seconds');
    expect(slower.improved).toBe(false);
    expect(slower.percentage).toBeLessThan(0);
  });

  it('reports more reps as an improvement', () => {
    const more = improvementOf(40, 42, 'Reps');
    expect(more.improved).toBe(true);
    expect(more.percentage).toBeCloseTo(5);
    expect(improvementOf(42, 40, 'Reps').improved).toBe(false);
  });

  it('does not divide by zero', () => {
    expect(improvementOf(0, 5, 'Reps').percentage).toBe(0);
  });
});
