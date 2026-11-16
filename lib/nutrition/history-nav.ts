import { addMonths, monthOf, parseMonth } from './dates';

/** How far back the history calendar goes. */
export const HISTORY_MONTHS = 12;

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
export const monthLabel = (month: string) => MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`));

/**
 * Month shown by a history page and the links around it. `params` are the page's other
 * search params, kept in every link so changing month keeps (for example) the stats period.
 */
export function monthNavigation(
  basePath: string,
  requested: unknown,
  today: string,
  params: Record<string, string> = {},
  anchor = 'history'
) {
  const newest = monthOf(today);
  const oldest = addMonths(newest, -(HISTORY_MONTHS - 1));
  const month = parseMonth(requested, oldest, newest);

  const href = (m: string) => {
    const query = new URLSearchParams({ ...params, month: m });
    return `${basePath}?${query.toString()}#${anchor}`;
  };
  const months = Array.from({ length: HISTORY_MONTHS }, (_, i) => {
    const value = addMonths(newest, -i);
    return { value, label: monthLabel(value), href: href(value) };
  });

  return {
    month,
    monthLabel: monthLabel(month),
    prevHref: month > oldest ? href(addMonths(month, -1)) : null,
    nextHref: month < newest ? href(addMonths(month, 1)) : null,
    months,
  };
}
