'use client';

import { ArrowDown, Check, Clock, MapPin, PartyPopper } from 'lucide-react';
import {
  nextSession,
  type FuelStep,
  type PlanSession,
  type StepStatus,
} from '@/lib/nutrition/plan';
import type { PortionItem } from '@/lib/nutrition/portions';
import { FoodChip } from './FoodChip';
import { STEP_ICON, tickLabel } from './FuelTimeline';
import { MealDetailsDialog } from './MealDetailsDialog';
import { PortionList } from './PortionList';

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

function duration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${String(m).padStart(2, '0')}` : `${h}h`;
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div
      className="relative size-24 shrink-0 sm:size-32 lg:size-36"
      role="img"
      aria-label={`${done} of ${total} steps done today`}
    >
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-white/10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="stroke-lime-300 transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">
          {done}
          <span className="text-base text-white/40 sm:text-lg">/{total}</span>
        </span>
        <span className="text-[10px] font-medium tracking-[0.14em] text-white/50 uppercase sm:text-[11px]">
          steps done
        </span>
      </div>
    </div>
  );
}

interface FuelHeroProps {
  dateLabel: string;
  now: string;
  sessions: PlanSession[];
  focus: FuelStep | null;
  focusStatus: StepStatus | null;
  doneCount: number;
  total: number;
  busy: boolean;
  error: string | null;
  /** The coach's portions for the step in focus, when a meal plan is set. */
  focusPortions: PortionItem[] | null;
  showNumbers: boolean;
  onTick: (step: FuelStep) => void;
}

export function FuelHero({
  dateLabel,
  now,
  sessions,
  focus,
  focusStatus,
  doneCount,
  total,
  busy,
  error,
  focusPortions,
  showNumbers,
  onTick,
}: FuelHeroProps) {
  const next = nextSession(sessions, now);
  const timed = sessions.filter((s) => s.start_time);
  const shown = next?.session ?? timed.at(-1) ?? sessions[0];

  let headline: string;
  if (sessions.length === 0) headline = 'Rest day';
  else if (next?.inProgress) headline = 'Training now';
  else if (next) headline = `Training in ${duration(next.minutesUntil)}`;
  else if (timed.length === 0) headline = 'Training today';
  else headline = 'Recover & refuel';

  const FocusIcon = focus ? STEP_ICON[focus.kind] : Check;
  const allDone = total > 0 && doneCount === total;

  return (
    <section
      data-reveal
      aria-labelledby="fuel-hero-title"
      className="relative overflow-hidden rounded-3xl bg-ink-radial p-6 text-white shadow-xl shadow-blue-950/10 sm:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-dark mask-fade-b opacity-70" />
      <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-lime-300/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-athletic text-sm font-bold tracking-[0.2em] text-lime-300 uppercase">
              Today&apos;s fuel · {dateLabel}
            </p>
            <h1
              id="fuel-hero-title"
              className="mt-1 font-athletic text-4xl leading-none font-extrabold uppercase italic sm:text-5xl"
            >
              {headline}
            </h1>
            {shown ? (
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/65">
                <span className="font-medium text-white/90">{shown.title}</span>
                {shown.start_time && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {hhmm(shown.start_time)}
                    {shown.end_time && `–${hhmm(shown.end_time)}`}
                  </span>
                )}
                {shown.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {shown.location}
                  </span>
                )}
              </p>
            ) : (
              <p className="mt-3 text-sm text-white/65">
                Your body gets stronger while it rests. Eat well and keep drinking water.
              </p>
            )}
          </div>
          <ProgressRing done={doneCount} total={total} />
        </div>

        <div className="mt-6 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur sm:p-5">
          {focus ? (
            <>
              <div className="flex items-center gap-2">
                {focusStatus === 'now' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-300 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-ink-950 uppercase">
                    <span className="size-1.5 animate-pulse rounded-full bg-ink-950" />
                    Now · until {focus.end}
                  </span>
                ) : (
                  <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white/80 uppercase">
                    Next · {focus.start}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lime-300 ring-1 ring-white/15">
                  <FocusIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{focus.title}</p>
                  <p className="mt-0.5 text-sm text-white/60">{focus.why}</p>
                </div>
              </div>
              {focusPortions && focusPortions.length > 0 ? (
                <PortionList items={focusPortions} dark className="mt-3 max-w-md" />
              ) : (
                focus.foods.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {focus.foods.map((id) => (
                      <FoodChip key={id} id={id} dark />
                    ))}
                  </div>
                )
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onTick(focus)}
                  disabled={busy}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-lime-300 px-5 text-sm font-bold text-ink-950 shadow-lg shadow-lime-300/20 transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60"
                >
                  <Check className="size-4" strokeWidth={3} />
                  {tickLabel(focus)}
                </button>
                {focusPortions && focusPortions.length > 0 ? (
                  <MealDetailsDialog
                    step={focus}
                    items={focusPortions}
                    showNumbers={showNumbers}
                    dark
                  />
                ) : (
                  <a
                    href="#fuel-plan"
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <ArrowDown className="size-4" />
                    Full plan
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-ink-950">
                <PartyPopper className="size-5" />
              </span>
              <div>
                <p className="font-semibold">
                  {allDone ? 'Every step done today. Ya3tik saha!' : 'That’s it for today.'}
                </p>
                <p className="text-sm text-white/60">
                  {allDone
                    ? 'Drink some water before bed and sleep well.'
                    : 'Ate something you didn’t tick? You can still tick it in the plan below.'}
                </p>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-rose-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
