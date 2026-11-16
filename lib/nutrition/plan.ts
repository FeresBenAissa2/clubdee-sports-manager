/**
 * Nutrition module — today's fuel plan (pure, safe to import from client and server).
 *
 * The plan is built from the club's training sessions of the day: when to eat
 * before training, when to snack, water during, and when to recover. On a rest
 * day it falls back to regular meals. Times are `HH:MM` in club time.
 */
import type { MealType } from './catalog';

export interface PlanSession {
  id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  location?: string | null;
}

export type StepKind =
  | 'breakfast'
  | 'lunch'
  | 'snack'
  | 'dinner'
  | 'pre_meal'
  | 'pre_snack'
  | 'during'
  | 'recovery'
  | 'refuel';

export interface FuelStep {
  /** Stable for the day, so a tick survives a reload. */
  id: string;
  kind: StepKind;
  start: string;
  end: string;
  title: string;
  why: string;
  /** Suggested dishes (ids from the food catalog). */
  foods: string[];
  /** Meal type logged when the step is ticked; null for steps that are not a meal (water during training). */
  mealType: MealType | null;
  sessionId?: string;
}

export type StepStatus = 'done' | 'now' | 'upcoming' | 'missed';

/** A session shorter than this is assumed when it has no end time. */
const DEFAULT_SESSION_MIN = 90;
/** Two sessions closer than this share one refuel step instead of two full sets. */
const DOUBLE_SESSION_GAP_MIN = 300;
/** Sessions that start before this are "early": no full meal before. */
const EARLY_START_MIN = 9 * 60;
/** Recovery after this is the evening meal. */
const EVENING_MIN = 19 * 60;

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toClock(minutes: number): string {
  const m = Math.min(23 * 60 + 59, Math.max(0, Math.round(minutes)));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

type Draft = Omit<FuelStep, 'start' | 'end'> & { start: number; end: number };

const MAIN_MEALS: Draft[] = [
  {
    id: 'breakfast',
    kind: 'breakfast',
    start: 7 * 60,
    end: 9 * 60,
    title: 'Breakfast',
    why: 'Start the day with energy and some protein — school and training run on it.',
    foods: ['bsissa', 'eggs', 'yogurt', 'fruit'],
    mealType: 'breakfast',
  },
  {
    id: 'lunch',
    kind: 'lunch',
    start: 12 * 60,
    end: 14 * 60,
    title: 'Lunch',
    why: 'A full plate: an energy source, protein and vegetables.',
    foods: ['couscous', 'riz-djerbi', 'grilled-chicken', 'salade-tunisienne'],
    mealType: 'lunch',
  },
  {
    id: 'dinner',
    kind: 'dinner',
    start: 19 * 60 + 30,
    end: 21 * 60,
    title: 'Dinner',
    why: 'Protein and vegetables help your body repair while you sleep.',
    foods: ['chorba', 'grilled-fish', 'makarouna', 'mechouia'],
    mealType: 'dinner',
  },
];

const REST_SNACK: Draft = {
  id: 'snack',
  kind: 'snack',
  start: 16 * 60,
  end: 17 * 60,
  title: 'Afternoon snack',
  why: 'A small snack keeps your energy steady until dinner.',
  foods: ['fruit', 'nuts', 'yogurt'],
  mealType: 'snack',
};

function trainingSteps(
  session: PlanSession,
  start: number,
  end: number,
  opts: { pre: boolean; recover: boolean }
): Draft[] {
  const steps: Draft[] = [];
  const early = start < EARLY_START_MIN;

  if (opts.pre && !early) {
    steps.push({
      id: `pre_meal:${session.id}`,
      kind: 'pre_meal',
      start: start - 180,
      end: start - 120,
      title: 'Energy meal',
      why: 'Eat 2–3 hours before training so the energy is ready and your stomach is light.',
      foods: ['couscous', 'makarouna', 'riz-djerbi', 'tabouna'],
      mealType: 'pre_training',
      sessionId: session.id,
    });
  }
  if (opts.pre) {
    steps.push({
      id: `pre_snack:${session.id}`,
      kind: 'pre_snack',
      start: early ? start - 60 : start - 75,
      end: early ? start - 20 : start - 30,
      title: early ? 'Light snack before training' : 'Pre-training snack',
      why: early
        ? 'No time for a full meal: a few dates or a fruit is enough to train well.'
        : 'Something small and easy to digest, about 1 hour before.',
      foods: early ? ['dates', 'fruit'] : ['dates', 'bsissa', 'fruit'],
      mealType: 'pre_training',
      sessionId: session.id,
    });
  }

  steps.push({
    id: `during:${session.id}`,
    kind: 'during',
    start,
    end,
    title: 'Water during training',
    why: 'Bring a full bottle and take small sips at every break.',
    foods: [],
    mealType: null,
    sessionId: session.id,
  });

  if (opts.recover) {
    const evening = end >= EVENING_MIN;
    const morning = end < 10 * 60;
    steps.push({
      id: `recovery:${session.id}`,
      kind: 'recovery',
      start: end,
      end: end + 90,
      title: evening ? 'Recovery dinner' : morning ? 'Recovery breakfast' : 'Recovery meal',
      why: 'Within 1–2 hours, combine protein and carbs to rebuild your muscles and energy.',
      foods: morning
        ? ['bsissa', 'eggs', 'rayeb', 'tabouna']
        : ['lablabi', 'grilled-chicken', 'rayeb', 'dates'],
      mealType: 'post_training',
      sessionId: session.id,
    });
  }
  return steps;
}

const overlaps = (a: Draft, b: Draft) => a.start < b.end && b.start < a.end;

/** Today's steps, earliest first. */
export function buildFuelPlan(sessions: PlanSession[]): FuelStep[] {
  const timed = sessions
    .filter((s) => s.start_time)
    .map((s) => {
      const start = toMinutes(s.start_time!);
      const end = s.end_time
        ? Math.max(toMinutes(s.end_time), start + 15)
        : start + DEFAULT_SESSION_MIN;
      return { session: s, start, end };
    })
    .sort((a, b) => a.start - b.start);
  const untimed = sessions.length > 0 && timed.length === 0;

  const training: Draft[] = [];
  timed.forEach(({ session, start, end }, i) => {
    const prev = timed[i - 1];
    const next = timed[i + 1];
    const closeToPrev = prev !== undefined && start - prev.end < DOUBLE_SESSION_GAP_MIN;
    const closeToNext = next !== undefined && next.start - end < DOUBLE_SESSION_GAP_MIN;

    training.push(
      ...trainingSteps(session, start, end, { pre: !closeToPrev, recover: !closeToNext })
    );
    if (closeToNext) {
      training.push({
        id: `refuel:${session.id}`,
        kind: 'refuel',
        start: end,
        end: Math.max(end + 15, Math.min(end + 60, next.start - 30)),
        title: 'Refuel between sessions',
        why: 'You train again soon: carbs and a little protein now, and keep drinking.',
        foods: ['rayeb', 'dates', 'tabouna', 'yogurt'],
        mealType: 'post_training',
        sessionId: session.id,
      });
    }
  });

  const meals = MAIN_MEALS.filter((meal) => !training.some((step) => overlaps(meal, step)));
  if (sessions.length === 0) meals.push(REST_SNACK);
  if (untimed) {
    // Training today but the coach has not set a time: keep regular meals and add a pre-training snack.
    meals.push({
      ...REST_SNACK,
      id: 'pre_snack:untimed',
      kind: 'pre_snack',
      title: 'Snack before training',
      why: 'Training today: have a light snack about 1 hour before it starts.',
      foods: ['dates', 'bsissa', 'fruit'],
      mealType: 'pre_training',
    });
  }

  return [...meals, ...training]
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .map((step) => ({ ...step, start: toClock(step.start), end: toClock(step.end) }));
}

/** `now` is `HH:MM` or `HH:MM:SS` in club time. */
export function stepStatus(step: FuelStep, now: string, done: boolean): StepStatus {
  if (done) return 'done';
  const t = toMinutes(now);
  if (t < toMinutes(step.start)) return 'upcoming';
  if (t < toMinutes(step.end)) return 'now';
  return 'missed';
}

/** The step to put forward: the open one happening now, else the next one coming, else null. */
export function focusStep(
  steps: FuelStep[],
  now: string,
  doneIds: ReadonlySet<string>
): FuelStep | null {
  const open = steps.filter((s) => !doneIds.has(s.id));
  return (
    open.find((s) => stepStatus(s, now, false) === 'now') ??
    open.find((s) => stepStatus(s, now, false) === 'upcoming') ??
    null
  );
}

/** The session in progress, else the next one today, else null. */
export function nextSession(
  sessions: PlanSession[],
  now: string
): { session: PlanSession; inProgress: boolean; minutesUntil: number } | null {
  const t = toMinutes(now);
  let best: { session: PlanSession; inProgress: boolean; minutesUntil: number } | null = null;
  for (const session of sessions) {
    if (!session.start_time) continue;
    const start = toMinutes(session.start_time);
    const end = session.end_time ? toMinutes(session.end_time) : start + DEFAULT_SESSION_MIN;
    if (t >= start && t < end) return { session, inProgress: true, minutesUntil: 0 };
    if (start > t && (!best || start - t < best.minutesUntil))
      best = { session, inProgress: false, minutesUntil: start - t };
  }
  return best;
}
