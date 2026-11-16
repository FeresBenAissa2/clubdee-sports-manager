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

/** `YYYY-MM` of a day key. */
export const monthOf = (key: string): string => key.slice(0, 7);

/** Moves a `YYYY-MM` month by whole months. */
export function addMonths(month: string, count: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + count, 1));
  return d.toISOString().slice(0, 7);
}

/** Days of a `YYYY-MM` month, oldest first, stopping at `until` (usually today). */
export function monthDays(month: string, until: string): string[] {
  const days: string[] = [];
  for (let key = `${month}-01`; monthOf(key) === month && key <= until; key = addDays(key, 1)) {
    days.push(key);
  }
  return days;
}

/** Reads a `YYYY-MM` value from a URL, kept between `oldest` and `newest`; anything else gives `newest`. */
export function parseMonth(value: unknown, oldest: string, newest: string): string {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return newest;
  if (value > newest) return newest;
  if (value < oldest) return oldest;
  return value;
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
