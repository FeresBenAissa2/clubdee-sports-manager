import { TrendingUp } from 'lucide-react';
import type { WeekTrend } from '@/lib/nutrition/trend';
import { cn } from '@/lib/utils';

const WEEK = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const label = (week: string) => WEEK.format(new Date(`${week}T00:00:00Z`));

function Bar({ pct, className, title }: { pct: number | null; className: string; title: string }) {
  return (
    <div className="flex h-full w-full items-end" title={title}>
      {pct === null ? (
        <div className="h-0.5 w-full rounded-full bg-slate-200" />
      ) : (
        <div
          className={cn('w-full rounded-t-md', className)}
          style={{ height: `${Math.max(pct, 3)}%` }}
        />
      )}
    </div>
  );
}

export function WeeklyTrend({ weeks, periodLabel }: { weeks: WeekTrend[]; periodLabel: string }) {
  // Keep the axis readable on long periods: label about 8 weeks at most.
  const every = Math.max(1, Math.ceil(weeks.length / 8));

  return (
    <section
      data-reveal
      aria-labelledby="trend-title"
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="trend-title" className="text-lg font-semibold text-foreground">
            Week by week
          </h2>
          <p className="text-sm text-muted-foreground">
            Plan steps ticked and water goal reached, {periodLabel}.
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
          <TrendingUp className="size-5" />
        </span>
      </div>

      <div className="mt-5 flex gap-3">
        <div className="flex h-40 flex-col justify-between pb-6 text-right text-[10px] text-muted-foreground tabular-nums">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-34 border-t border-dashed border-border/70" />
          <div className="pointer-events-none absolute inset-x-0 top-17 border-t border-dashed border-border/70" />
          <ol className="flex h-40 items-stretch gap-1 sm:gap-1.5" aria-label="Weekly trend">
            {weeks.map((w, i) => (
              <li key={w.week} className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-34 gap-0.5 border-b border-border">
                  <Bar
                    pct={w.planPct}
                    className="bg-lime-400"
                    title={`Week of ${label(w.week)}: plan ${w.planPct === null ? 'not used' : `${w.planPct}%`}`}
                  />
                  <Bar
                    pct={w.waterPct}
                    className="bg-sky-400"
                    title={`Week of ${label(w.week)}: water ${w.waterPct === null ? 'not logged' : `${w.waterPct}%`}`}
                  />
                </div>
                <span className="mt-1.5 h-4 truncate text-center text-[10px] text-muted-foreground">
                  {i % every === 0 || i === weeks.length - 1 ? label(w.week) : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-lime-400" /> Plan steps ticked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-sky-400" /> Water goal reached
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-slate-300" /> Not logged
        </span>
      </div>
    </section>
  );
}
