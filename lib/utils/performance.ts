/**
 * Helpers for reading test results.
 *
 * Most tests are "higher is better" (reps, metres, kilograms, points), but timed
 * tests are the opposite: 30.2 s is a better 50 m than 31.5 s. Use these helpers
 * instead of comparing scores directly.
 */

const TIME_UNITS = new Set(['seconds', 'second', 'sec', 'secs', 's', 'minutes', 'minute', 'min', 'mins', 'hours', 'hour', 'h', 'ms']);

/** True when a smaller score is the better result (timed tests). */
export function lowerIsBetter(unit: string | null | undefined): boolean {
  return TIME_UNITS.has((unit ?? '').trim().toLowerCase());
}

/** The better of two scores for a unit. */
export function betterScore(a: number, b: number, unit: string | null | undefined): number {
  return lowerIsBetter(unit) ? Math.min(a, b) : Math.max(a, b);
}

/** The best score of a list for a unit. */
export function bestScore(scores: number[], unit: string | null | undefined): number {
  return lowerIsBetter(unit) ? Math.min(...scores) : Math.max(...scores);
}

/**
 * How much `current` improved over `previous`: positive means better, negative
 * worse, whatever the unit. `percentage` is relative to `previous`.
 */
export function improvementOf(
  previous: number,
  current: number,
  unit: string | null | undefined
): { change: number; gain: number; percentage: number; improved: boolean } {
  const change = current - previous;
  const gain = lowerIsBetter(unit) ? -change : change;
  const percentage = previous !== 0 ? (gain / Math.abs(previous)) * 100 : 0;
  return { change, gain, percentage, improved: gain > 0 };
}
