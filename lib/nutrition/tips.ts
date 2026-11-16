import { BASE_GLASS_GOAL, TRAINING_DAY_BONUS } from './catalog';
import { clockNow } from './dates';

export interface SessionSlot {
  title: string;
  start_time: string | null;
  end_time: string | null;
}

export function hydrationGoal(sessionsToday: number): number {
  return BASE_GLASS_GOAL + (sessionsToday > 0 ? TRAINING_DAY_BONUS : 0);
}

/** A coach is only warned about low hydration once an athlete has this many days of history. */
export const MIN_DAYS_FOR_HYDRATION_FLAG = 3;

/**
 * Average share of the daily water goal an athlete reached (0–100).
 *
 * The average starts on the athlete's first logged day inside `days` (oldest first),
 * so someone who began logging today is measured on one day rather than penalised for
 * the six days before they started. Days skipped after that first log count as zero.
 */
export function hydrationSummary(
  days: string[],
  logs: { date: string; glasses: number; goal?: number }[]
): { pct: number; daysTracked: number } {
  const byDay = new Map(logs.filter((log) => log.glasses > 0).map((log) => [log.date, log]));
  const first = days.findIndex((date) => byDay.has(date));
  if (first < 0) return { pct: 0, daysTracked: 0 };

  const tracked = days.slice(first);
  const reached = tracked.reduce((sum, date) => {
    const log = byDay.get(date);
    return sum + (log ? Math.min(1, log.glasses / (log.goal || BASE_GLASS_GOAL)) : 0);
  }, 0);
  return { pct: Math.round((reached / tracked.length) * 100), daysTracked: tracked.length };
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

/** One tip for today, based on the club's session schedule (`now` is `HH:MM:SS`). */
export function trainingTip(sessions: SessionSlot[], now = clockNow()): { title: string; body: string } {
  const upcoming = sessions.find((s) => !s.start_time || s.start_time > now);
  const finished = [...sessions].reverse().find((s) => s.end_time && s.end_time <= now);

  if (upcoming) {
    const at = hhmm(upcoming.start_time);
    return {
      title: at ? `Training at ${at}` : 'Training today',
      body: 'Eat an energy meal (couscous, makarouna, riz djerbi) 2–3 hours before, then a light snack like dates or bsissa about 1 hour before. Bring a water bottle.',
    };
  }
  if (finished) {
    return {
      title: 'Recovery time',
      body: 'Within 1–2 hours after training, combine protein and carbs: lablabi, grilled chicken with rice, or rayeb with dates. Keep drinking water.',
    };
  }
  if (sessions.length > 0) {
    return {
      title: 'Training in progress',
      body: 'Take small sips of water at every break. Eat a recovery meal with protein and carbs within 1–2 hours after you finish.',
    };
  }
  return {
    title: 'Rest day',
    body: 'Keep your water steady through the day. Vegetables, fruit and protein help your body recover for the next session.',
  };
}
