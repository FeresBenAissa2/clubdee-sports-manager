/**
 * Calendar day (`YYYY-MM-DD`) of a moment in the local time zone of whoever runs
 * the code (the server for server code, the browser for client code).
 *
 * Do not use `date.toISOString().split('T')[0]` for "today": that is the UTC day,
 * which is yesterday for the first hours after midnight east of Greenwich, so
 * today's training session would be filed under tomorrow.
 */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
