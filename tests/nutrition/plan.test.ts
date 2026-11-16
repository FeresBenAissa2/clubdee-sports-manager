import { describe, expect, it } from 'vitest';
import { FOOD_BY_ID } from '@/lib/nutrition/catalog';
import {
  buildFuelPlan,
  focusStep,
  nextSession,
  stepStatus,
  type PlanSession,
} from '@/lib/nutrition/plan';

const session = (id: string, start: string | null, end: string | null): PlanSession => ({
  id,
  title: `Session ${id}`,
  start_time: start,
  end_time: end,
});

const ids = (sessions: PlanSession[]) => buildFuelPlan(sessions).map((s) => s.id);
const find = (sessions: PlanSession[], id: string) =>
  buildFuelPlan(sessions).find((s) => s.id === id)!;

describe('fuel plan', () => {
  it('gives regular meals on a rest day', () => {
    expect(ids([])).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
  });

  it('plans around an afternoon session', () => {
    const s = [session('a', '17:30:00', '19:00:00')];
    expect(ids(s)).toEqual([
      'breakfast',
      'lunch',
      'pre_meal:a',
      'pre_snack:a',
      'during:a',
      'recovery:a',
    ]);
    expect(find(s, 'pre_meal:a')).toMatchObject({
      start: '14:30',
      end: '15:30',
      mealType: 'pre_training',
    });
    expect(find(s, 'pre_snack:a')).toMatchObject({ start: '16:15', end: '17:00' });
    expect(find(s, 'during:a')).toMatchObject({ start: '17:30', end: '19:00', mealType: null });
    // Recovery runs into dinner time, so it replaces dinner.
    expect(find(s, 'recovery:a')).toMatchObject({
      start: '19:00',
      end: '20:30',
      title: 'Recovery dinner',
    });
  });

  it('skips the full meal before an early swim and turns breakfast into recovery', () => {
    const s = [session('swim', '06:30:00', '07:30:00')];
    expect(ids(s)).toEqual(['pre_snack:swim', 'during:swim', 'recovery:swim', 'lunch', 'dinner']);
    expect(find(s, 'pre_snack:swim')).toMatchObject({
      start: '05:30',
      end: '06:10',
      title: 'Light snack before training',
    });
    expect(find(s, 'recovery:swim').title).toBe('Recovery breakfast');
  });

  it('handles a late session that overlaps dinner time', () => {
    const s = [session('late', '21:00:00', '22:30:00')];
    expect(ids(s)).toEqual([
      'breakfast',
      'lunch',
      'pre_meal:late',
      'pre_snack:late',
      'during:late',
      'recovery:late',
    ]);
    expect(find(s, 'recovery:late')).toMatchObject({ start: '22:30', end: '23:59' });
  });

  it('gives each of two distant sessions its own steps', () => {
    const s = [session('pm', '16:00:00', '17:30:00'), session('am', '09:00:00', '10:30:00')];
    expect(ids(s)).toEqual([
      'pre_meal:am',
      'pre_snack:am',
      'during:am',
      'recovery:am',
      'pre_meal:pm',
      'pre_snack:pm',
      'during:pm',
      'recovery:pm',
      'dinner',
    ]);
  });

  it('shares one refuel step between two close sessions', () => {
    const s = [session('one', '08:00:00', '09:30:00'), session('two', '11:00:00', '12:30:00')];
    const plan = ids(s);
    expect(plan).toContain('refuel:one');
    expect(plan).not.toContain('recovery:one');
    expect(plan).not.toContain('pre_snack:two');
    expect(plan).toContain('recovery:two');
    expect(find(s, 'refuel:one')).toMatchObject({ start: '09:30', end: '10:30' });
  });

  it('assumes 90 minutes when a session has no end time', () => {
    expect(find([session('a', '17:00:00', null)], 'during:a')).toMatchObject({
      start: '17:00',
      end: '18:30',
    });
  });

  it('keeps meals and adds a snack when the session has no time', () => {
    expect(ids([session('x', null, null)])).toEqual([
      'breakfast',
      'lunch',
      'pre_snack:untimed',
      'dinner',
    ]);
  });

  it('only suggests dishes from the catalog and never repeats a step id', () => {
    for (const sessions of [
      [],
      [session('a', '17:30:00', '19:00:00')],
      [session('b', '06:30:00', '07:30:00')],
    ]) {
      const plan = buildFuelPlan(sessions);
      expect(new Set(plan.map((s) => s.id)).size).toBe(plan.length);
      for (const step of plan) step.foods.forEach((id) => expect(FOOD_BY_ID.has(id)).toBe(true));
    }
  });
});

describe('step status', () => {
  const [step] = buildFuelPlan([session('a', '17:30:00', '19:00:00')]).filter(
    (s) => s.kind === 'pre_snack'
  );

  it('follows the clock around the window edges', () => {
    expect(stepStatus(step, '16:14:59', false)).toBe('upcoming');
    expect(stepStatus(step, '16:15:00', false)).toBe('now');
    expect(stepStatus(step, '16:59', false)).toBe('now');
    expect(stepStatus(step, '17:00', false)).toBe('missed');
  });

  it('is done whenever ticked, even early', () => {
    expect(stepStatus(step, '08:00', true)).toBe('done');
  });
});

describe('focus and next session', () => {
  const sessions = [session('a', '17:30:00', '19:00:00')];
  const plan = buildFuelPlan(sessions);

  it('puts forward the open step happening now', () => {
    expect(focusStep(plan, '16:30', new Set())?.id).toBe('pre_snack:a');
  });

  it('moves to the next step once the current one is ticked', () => {
    expect(focusStep(plan, '16:30', new Set(['pre_snack:a']))?.id).toBe('during:a');
  });

  it('has nothing left at the end of the day', () => {
    expect(focusStep(plan, '23:59', new Set())).toBeNull();
  });

  it('counts down to the next session and notices one in progress', () => {
    expect(nextSession(sessions, '15:00')).toMatchObject({ inProgress: false, minutesUntil: 150 });
    expect(nextSession(sessions, '18:00')).toMatchObject({ inProgress: true });
    expect(nextSession(sessions, '19:30')).toBeNull();
    expect(nextSession([session('x', null, null)], '10:00')).toBeNull();
  });
});
