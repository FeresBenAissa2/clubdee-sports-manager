import { weekStart } from './dates';

export interface TrendDay {
  date: string;
  steps: { id: string }[];
  done: string[];
  glasses: number;
  goal: number;
  meals: unknown[];
}

export interface WeekTrend {
  /** Monday of the week. */
  week: string;
  /** Share of plan steps ticked (0–100), or null when the plan was not used that week. */
  planPct: number | null;
  /** Average share of the daily water goal (0–100), or null when no water was logged that week. */
  waterPct: number | null;
  trainingDays: number;
}

/** Groups days (oldest first) into Monday-based weeks for a trend chart. */
export function weeklyTrend(days: (TrendDay & { sessions: unknown[] })[]): WeekTrend[] {
  const weeks = new Map<string, (TrendDay & { sessions: unknown[] })[]>();
  for (const day of days) {
    const key = weekStart(day.date);
    weeks.set(key, [...(weeks.get(key) ?? []), day]);
  }
  return [...weeks.entries()].map(([week, list]) => {
    const planned = list.reduce((sum, d) => sum + d.steps.length, 0);
    const done = list.reduce((sum, d) => sum + Math.min(d.done.length, d.steps.length), 0);
    const watered = list.filter((d) => d.glasses > 0);
    return {
      week,
      planPct: done > 0 && planned > 0 ? Math.round((done / planned) * 100) : null,
      waterPct: watered.length
        ? Math.round(
            (list.reduce((sum, d) => sum + Math.min(1, d.glasses / (d.goal || 1)), 0) /
              list.length) *
              100
          )
        : null,
      trainingDays: list.filter((d) => d.sessions.length > 0).length,
    };
  });
}
