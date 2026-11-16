/**
 * Time zone the club lives in. Days ("today", "this week") are counted in it.
 *
 * It defaults to the server's own zone, like the rest of the app, so everything
 * agrees on what "today" is. On a host that runs in UTC (most cloud hosts), set
 * `APP_TIME_ZONE=Africa/Tunis` (and `TZ=Africa/Tunis` for the rest of the app).
 */
export const APP_TIME_ZONE: string =
  process.env.APP_TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Tunis';

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` for the given instant in club time. */
export function dayKey(at: Date = new Date(), timeZone: string = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** Moves a `YYYY-MM-DD` key by whole days. */
export function addDays(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(key, -((weekday + 6) % 7));
}

/** The last `count` day keys, oldest first, ending with `end`. */
export function lastDays(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(end, i - count + 1));
}

/** Current `HH:MM:SS` in club time, comparable with session start/end times. */
export function clockNow(at: Date = new Date(), timeZone: string = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(at);
}
