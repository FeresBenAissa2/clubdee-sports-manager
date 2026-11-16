import { describe, expect, it } from 'vitest';
import {
  activityFactor,
  ageOn,
  dailyEnergy,
  nearestLevel,
  resolveLevel,
  toSex,
  validMetrics,
  weeklyTrainingHours,
} from '@/lib/nutrition/energy';
import { PLAN_LEVELS } from '@/lib/nutrition/portions';

const adult = { age: 20, hoursPerWeek: 4, goal: 'maintain' as const };

describe('daily energy', () => {
  it('gives a tall heavy man more than a small light woman', () => {
    const man = dailyEnergy({ ...adult, sex: 'male', heightCm: 190, weightKg: 70 });
    const woman = dailyEnergy({ ...adult, sex: 'female', heightCm: 160, weightKg: 50 });
    // 10·70 + 6.25·190 − 5·20 + 5 = 1792.5; × 1.7 ≈ 3047 → 3000
    expect(man).toMatchObject({
      formula: 'Mifflin-St Jeor',
      bmr: 1793,
      factor: 1.7,
      raw: 3047,
      level: 3000,
    });
    // 10·50 + 6.25·160 − 5·20 − 161 = 1239; × 1.7 ≈ 2106 → 2000
    expect(woman).toMatchObject({ bmr: 1239, raw: 2106, level: 2000 });
  });

  it('uses Schofield for teenagers', () => {
    const boy = dailyEnergy({
      age: 15,
      sex: 'male',
      heightCm: 170,
      weightKg: 60,
      hoursPerWeek: 4,
      goal: 'maintain',
    });
    expect(boy.formula).toBe('Schofield (10–17 years)');
    expect(boy.bmr).toBe(Math.round(17.686 * 60 + 658.2));
  });

  it('averages both formulas when sex is unknown', () => {
    const male = dailyEnergy({ ...adult, sex: 'male', heightCm: 175, weightKg: 65 }).bmr;
    const female = dailyEnergy({ ...adult, sex: 'female', heightCm: 175, weightKg: 65 }).bmr;
    const unknown = dailyEnergy({ ...adult, sex: null, heightCm: 175, weightKg: 65 }).bmr;
    expect(Math.abs(unknown - (male + female) / 2)).toBeLessThanOrEqual(1);
  });

  it('applies goals to adults only', () => {
    const base = { sex: 'male' as const, heightCm: 180, weightKg: 75, hoursPerWeek: 4 };
    const maintain = dailyEnergy({ ...base, age: 25, goal: 'maintain' }).raw;
    expect(dailyEnergy({ ...base, age: 25, goal: 'gain' }).raw).toBe(maintain + 300);
    expect(dailyEnergy({ ...base, age: 25, goal: 'reduce' }).raw).toBe(maintain - 300);
    expect(dailyEnergy({ ...base, age: 16, goal: 'reduce' })).toMatchObject({
      goal: 'maintain',
      goalKcal: 0,
    });
  });

  it('keeps levels inside the preset range', () => {
    expect(nearestLevel(900)).toBe(1500);
    expect(nearestLevel(9000)).toBe(4500);
    expect(nearestLevel(2120)).toBe(2000);
    expect(nearestLevel(2130)).toBe(2250);
    expect(PLAN_LEVELS[0]).toBe(1500);
    expect(PLAN_LEVELS.at(-1)).toBe(4500);
  });
});

describe('training load', () => {
  it('maps weekly hours to an activity factor', () => {
    expect(activityFactor(0).factor).toBe(1.4);
    expect(activityFactor(1).factor).toBe(1.55);
    expect(activityFactor(4).factor).toBe(1.7);
    expect(activityFactor(8).factor).toBe(1.85);
    expect(activityFactor(12).factor).toBe(2.0);
  });

  it('averages four weeks of sessions', () => {
    // Mon + Wed 90 min and Fri 60 min, for four weeks: 4 h a week.
    const week = [
      { start_time: '17:30:00', end_time: '19:00:00' },
      { start_time: '17:30:00', end_time: '19:00:00' },
      { start_time: '06:30:00', end_time: '07:30:00' },
    ];
    expect(weeklyTrainingHours([...week, ...week, ...week, ...week])).toBe(4);
    // A session without times counts 1.5 h.
    expect(weeklyTrainingHours([{ start_time: null, end_time: null }], 7)).toBe(1.5);
  });
});

describe('profile helpers', () => {
  it('computes age on a date', () => {
    expect(ageOn('2004-05-12', '2026-11-16')).toBe(22);
    expect(ageOn('2008-11-17', '2026-11-16')).toBe(17);
    expect(ageOn('2008-11-16', '2026-11-16')).toBe(18);
    expect(ageOn(null, '2026-11-16')).toBeNull();
  });

  it('reads sex and checks measurements', () => {
    expect(toSex('female')).toBe('female');
    expect(toSex('other')).toBeNull();
    expect(validMetrics('190', '70.25')).toEqual({ heightCm: 190, weightKg: 70.3 });
    expect(validMetrics(100, 70)).toBeNull();
    expect(validMetrics(180, 300)).toBeNull();
    expect(validMetrics('abc', 70)).toBeNull();
  });

  it('chooses the level: coach fixed, then recommendation, then plan', () => {
    expect(resolveLevel({ fixedLevel: 3500, recommended: 2250, planLevel: 2750 })).toEqual({
      level: 3500,
      source: 'fixed',
    });
    expect(resolveLevel({ fixedLevel: null, recommended: 2250, planLevel: 2750 })).toEqual({
      level: 2250,
      source: 'recommended',
    });
    expect(resolveLevel({ fixedLevel: null, recommended: null, planLevel: 2750 })).toEqual({
      level: 2750,
      source: 'plan',
    });
    expect(resolveLevel({ fixedLevel: null, recommended: null, planLevel: null })).toBeNull();
  });
});
