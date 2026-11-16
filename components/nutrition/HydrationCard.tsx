'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { Droplet, Flame, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { changeGlasses } from '@/lib/nutrition/actions';
import { GLASS_ML, MAX_GLASSES, TRAINING_DAY_BONUS } from '@/lib/nutrition/catalog';
import { cn } from '@/lib/utils';

export interface HydrationDay {
  date: string;
  glasses: number;
  goal: number;
}

interface HydrationCardProps {
  glasses: number;
  goal: number;
  trainingDay: boolean;
  /** Last 7 days, oldest first, ending today. */
  week: HydrationDay[];
}

const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'narrow', timeZone: 'UTC' });

export function HydrationCard({ glasses, goal, trainingDay, week }: HydrationCardProps) {
  const [optimistic, setOptimistic] = useOptimistic(glasses);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const change = (delta: 1 | -1) => {
    setError(null);
    startTransition(async () => {
      setOptimistic((g) => Math.min(MAX_GLASSES, Math.max(0, g + delta)));
      const result = await changeGlasses(delta);
      if (!result.ok) setError(result.error);
    });
  };

  const pct = Math.min(100, Math.round((optimistic / goal) * 100));
  const reached = optimistic >= goal;
  const days = week.map((d, i) =>
    i === week.length - 1 ? { ...d, glasses: optimistic, goal } : d
  );

  // Consecutive days on goal, ending today (or yesterday while today is still in progress).
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].glasses >= days[i].goal) streak++;
    else if (i !== days.length - 1) break;
  }

  // Ring around the glass counter.
  const r = 46;
  const c = 2 * Math.PI * r;

  return (
    <section
      data-reveal
      aria-labelledby="hydration-title"
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="hydration-title" className="text-lg font-semibold text-foreground">
            Water
          </h2>
          <p className="text-sm text-muted-foreground">
            Goal {goal} glasses · ~{((goal * GLASS_ML) / 1000).toFixed(1)} L
            {trainingDay && (
              <span className="text-blue-600"> · training day +{TRAINING_DAY_BONUS}</span>
            )}
          </p>
        </div>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
            <Flame className="size-3.5" />
            {streak} {streak === 1 ? 'day' : 'days'}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Remove a glass"
          onClick={() => change(-1)}
          disabled={optimistic <= 0}
          className="rounded-full"
        >
          <Minus className="size-4" />
        </Button>

        <div className="relative size-32">
          <svg viewBox="0 0 110 110" className="size-full -rotate-90" aria-hidden>
            <circle cx="55" cy="55" r={r} fill="none" strokeWidth="9" className="stroke-sky-100" />
            <circle
              cx="55"
              cy="55"
              r={r}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct / 100)}
              className={cn(
                'transition-[stroke-dashoffset] duration-500',
                reached ? 'stroke-emerald-500' : 'stroke-sky-500'
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Droplet
              className={cn(
                'size-4',
                reached ? 'fill-emerald-500 text-emerald-500' : 'fill-sky-500 text-sky-500'
              )}
            />
            <p
              className="font-display text-3xl font-semibold tabular-nums text-foreground"
              aria-live="polite"
            >
              {optimistic}
              <span className="text-base text-muted-foreground">/{goal}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">glasses</p>
          </div>
        </div>

        <Button
          type="button"
          size="icon-lg"
          aria-label="Add a glass"
          onClick={() => change(1)}
          disabled={optimistic >= MAX_GLASSES}
          className="rounded-full bg-sky-600 shadow-lg shadow-sky-600/20 hover:bg-sky-700"
        >
          <Plus className="size-5" />
        </Button>
      </div>

      <p
        className={cn(
          'mt-3 text-center text-sm',
          reached ? 'font-medium text-emerald-600' : 'text-muted-foreground'
        )}
      >
        {reached ? 'Goal reached — ya3tik saha!' : `${goal - optimistic} more to reach your goal`}
      </p>
      {error && <p className="mt-2 text-center text-sm text-rose-600">{error}</p>}
      {pending && <span className="sr-only">Saving…</span>}

      <div className="mt-5 border-t border-border/70 pt-4">
        <p className="text-xs font-medium text-muted-foreground">Last 7 days</p>
        <div className="mt-2 flex h-20 items-end gap-2">
          {days.map((day, i) => {
            const dayPct = Math.min(100, Math.round((day.glasses / day.goal) * 100));
            const today = i === days.length - 1;
            return (
              <div
                key={day.date}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <div
                  className="flex w-full flex-1 items-end overflow-hidden rounded-md bg-secondary"
                  title={`${day.glasses} / ${day.goal} glasses`}
                >
                  <div
                    className={cn(
                      'w-full rounded-md transition-[height] duration-500',
                      dayPct >= 100 ? 'bg-emerald-500' : today ? 'bg-sky-500' : 'bg-sky-300'
                    )}
                    style={{ height: `${Math.max(dayPct, day.glasses > 0 ? 6 : 0)}%` }}
                  />
                </div>
                <span
                  className={cn(
                    'text-[11px]',
                    today ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {WEEKDAY.format(new Date(`${day.date}T00:00:00Z`))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
