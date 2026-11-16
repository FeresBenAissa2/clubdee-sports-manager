import { HeartPulse } from 'lucide-react';
import { CHECKIN_FIELDS } from '@/lib/nutrition/catalog';
import type { CheckInEntry } from '@/lib/nutrition/data';
import { cn } from '@/lib/utils';

const WEEK = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const label = (week: string) => WEEK.format(new Date(`${week}T00:00:00Z`));

function scoreClass(score: number) {
  if (score <= 2) return 'bg-rose-100 text-rose-700';
  if (score === 3) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

interface CheckInTrendProps {
  /** Mondays to show, oldest first. */
  weeks: string[];
  entries: CheckInEntry[];
}

export function CheckInTrend({ weeks, entries }: CheckInTrendProps) {
  const byWeek = new Map(entries.map((e) => [e.week, e]));
  const notes = [...entries].reverse().filter((e) => e.note);

  return (
    <section
      data-reveal
      aria-labelledby="checkin-trend-title"
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="checkin-trend-title" className="text-lg font-semibold text-foreground">
            Weekly check-ins
          </h2>
          <p className="text-sm text-muted-foreground">How they felt, week by week (1–5).</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-100">
          <HeartPulse className="size-5" />
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th scope="col" className="sr-only">
                Question
              </th>
              {weeks.map((w) => (
                <th
                  key={w}
                  scope="col"
                  className="px-1 pb-2 text-center text-[11px] font-medium whitespace-nowrap text-muted-foreground"
                >
                  {label(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHECKIN_FIELDS.map((field) => (
              <tr key={field.id}>
                <th
                  scope="row"
                  className="py-1 pr-2 text-left font-medium whitespace-nowrap text-foreground"
                >
                  {field.label}
                </th>
                {weeks.map((w) => {
                  const score = byWeek.get(w)?.[field.id];
                  return (
                    <td key={w} className="p-1 text-center">
                      {score ? (
                        <span
                          title={`${field.label}: ${score}/5`}
                          className={cn(
                            'inline-flex size-8 items-center justify-center rounded-lg text-sm font-semibold tabular-nums',
                            scoreClass(score)
                          )}
                        >
                          {score}
                        </span>
                      ) : (
                        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-secondary/60 text-muted-foreground">
                          –
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {notes.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-border/70 pt-4">
          {notes.map((e) => (
            <li key={e.week} className="rounded-xl bg-secondary/50 p-3 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Week of {label(e.week)}
              </span>
              <p className="mt-0.5 text-foreground">“{e.note}”</p>
            </li>
          ))}
        </ul>
      ) : (
        entries.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No check-ins in these weeks yet.</p>
        )
      )}
    </section>
  );
}
