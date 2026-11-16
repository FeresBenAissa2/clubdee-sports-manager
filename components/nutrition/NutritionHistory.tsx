'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplet,
  ListChecks,
  UtensilsCrossed,
} from 'lucide-react';
import { FOOD_BY_ID, MEAL_TYPES } from '@/lib/nutrition/catalog';
import type { HistoryMeal, NutritionDay } from '@/lib/nutrition/data';
import { planSummary, stepStatus, type FuelStep, type StepStatus } from '@/lib/nutrition/plan';
import { hydrationSummary } from '@/lib/nutrition/tips';
import { cn } from '@/lib/utils';
import { STEP_ICON } from './FuelTimeline';
import { MEAL_ICON } from './MealLogger';

const LONG = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const asDate = (key: string) => new Date(`${key}T00:00:00Z`);
const MEAL_LABEL = new Map(MEAL_TYPES.map((m) => [m.id, m.label]));
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

const STATUS_CHIP: Record<StepStatus, { label: string; className: string }> = {
  done: { label: 'Done', className: 'bg-lime-300 text-ink-950' },
  missed: { label: 'Missed', className: 'bg-slate-100 text-slate-500' },
  now: { label: 'Now', className: 'bg-blue-600 text-white' },
  upcoming: { label: 'Later', className: 'bg-secondary text-muted-foreground' },
};

export interface MonthOption {
  value: string;
  label: string;
  href: string;
}

const doneCount = (day: NutritionDay) => day.steps.filter((s) => day.done.includes(s.id)).length;
const logged = (day: NutritionDay) =>
  day.done.length > 0 || day.meals.length > 0 || day.glasses > 0;

function statusOf(day: NutritionDay, step: FuelStep, today: string, now: string): StepStatus {
  const done = day.done.includes(step.id);
  if (day.date < today) return done ? 'done' : 'missed';
  return stepStatus(step, now, done);
}

function foodsText(meal: HistoryMeal) {
  const names = meal.items.map((id) => FOOD_BY_ID.get(id)?.name ?? id).join(', ');
  return [names, meal.note].filter(Boolean).join(' — ');
}

/** Cell colour: how much of that day's plan was ticked. */
function cellTone(day: NutritionDay) {
  const pct = day.steps.length ? doneCount(day) / day.steps.length : 0;
  if (pct >= 0.75) return 'bg-lime-400 text-ink-950';
  if (pct >= 0.4) return 'bg-lime-200 text-ink-950';
  if (pct > 0) return 'bg-lime-100 text-foreground';
  if (logged(day)) return 'bg-slate-200/70 text-foreground';
  return 'bg-secondary/60 text-muted-foreground';
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Droplet;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-blue-600 ring-1 ring-border">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] text-muted-foreground">{label}</span>
        <span className="block text-sm font-semibold text-foreground tabular-nums">{value}</span>
      </span>
    </div>
  );
}

function MonthCalendar({
  month,
  days,
  today,
  selected,
  onSelect,
}: {
  month: string;
  days: NutritionDay[];
  today: string;
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const [y, m] = month.split('-').map(Number);
  const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const byDate = new Map(days.map((d) => [d.date, d]));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5" role="grid" aria-label="Days of the month">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} aria-hidden />
        ))}
        {Array.from({ length }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`;
          const day = byDate.get(date);
          if (!day) {
            // Still to come.
            return (
              <span
                key={date}
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground/50 tabular-nums"
              >
                {i + 1}
              </span>
            );
          }
          const isSelected = date === selected;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-label={`${LONG.format(asDate(date))}: ${doneCount(day)} of ${day.steps.length} plan steps${day.sessions.length ? ', training day' : ''}`}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-[transform,box-shadow] hover:scale-105',
                cellTone(day),
                isSelected && 'ring-2 ring-blue-600 ring-offset-2 ring-offset-card',
                date === today && !isSelected && 'ring-1 ring-blue-300'
              )}
            >
              {i + 1}
              {day.sessions.length > 0 && (
                <span className="absolute bottom-1 size-1.5 rounded-full bg-blue-600" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          Plan steps done
          <span className="size-3 rounded bg-lime-100" />
          <span className="size-3 rounded bg-lime-200" />
          <span className="size-3 rounded bg-lime-400" />
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-slate-200/70" /> Logged, no plan steps
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-blue-600" /> Training day
        </span>
      </div>
    </div>
  );
}

function DayDetail({
  day,
  today,
  now,
  subject,
}: {
  day: NutritionDay;
  today: string;
  now: string;
  subject: string;
}) {
  const done = doneCount(day);
  const planMeals = new Map(day.meals.filter((m) => m.plan_step).map((m) => [m.plan_step!, m]));
  const otherMeals = day.meals.filter((m) => !m.plan_step);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-foreground">
          {day.date === today ? 'Today' : LONG.format(asDate(day.date))}
        </h3>
        <p className="text-sm text-muted-foreground">
          {day.sessions.length === 0
            ? 'Rest day'
            : day.sessions
                .map((s) =>
                  [s.title, hhmm(s.start_time) && `${hhmm(s.start_time)}–${hhmm(s.end_time) ?? ''}`]
                    .filter(Boolean)
                    .join(' · ')
                )
                .join(', ')}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Stat icon={ListChecks} label="Plan" value={`${done} / ${day.steps.length} steps`} />
        <Stat
          icon={Droplet}
          label="Water"
          value={`${day.glasses} / ${day.goal} glasses${day.glasses >= day.goal ? ' ✓' : ''}`}
        />
        <Stat icon={UtensilsCrossed} label="Meals logged" value={String(day.meals.length)} />
      </div>

      {!logged(day) && day.date < today ? (
        <p className="mt-4 rounded-xl bg-secondary/50 px-4 py-6 text-center text-sm text-muted-foreground">
          {subject === 'You'
            ? 'You didn’t log anything this day.'
            : `${subject} didn’t log anything this day.`}
        </p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-border/60" aria-label="Plan steps">
            {day.steps.map((step) => {
              const status = statusOf(day, step, today, now);
              const meal = planMeals.get(step.id);
              const Icon = STEP_ICON[step.kind];
              const chip = STATUS_CHIP[status];
              return (
                <li key={step.id} className="flex items-start gap-3 py-2.5">
                  <span
                    className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                      status === 'done'
                        ? 'bg-lime-50 text-lime-700 ring-lime-200'
                        : 'bg-secondary text-muted-foreground ring-border'
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={cn(
                          'font-medium',
                          status === 'missed' ? 'text-muted-foreground' : 'text-foreground'
                        )}
                      >
                        {step.title}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        <Clock className="size-3" />
                        {step.start}–{step.end}
                      </span>
                    </p>
                    {meal && meal.items.length > 0 && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{foodsText(meal)}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
                      chip.className
                    )}
                  >
                    {chip.label}
                  </span>
                </li>
              );
            })}
          </ul>

          {otherMeals.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Other meals
              </h4>
              <ul className="mt-2 space-y-2">
                {otherMeals.map((meal) => {
                  const Icon = MEAL_ICON[meal.meal_type] ?? UtensilsCrossed;
                  return (
                    <li
                      key={meal.id}
                      className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-blue-600 ring-1 ring-border">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {MEAL_LABEL.get(meal.meal_type) ?? 'Meal'}
                        </p>
                        <p className="text-sm text-muted-foreground">{foodsText(meal) || '—'}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface NutritionHistoryProps {
  /** The month's days up to today, oldest first. */
  days: NutritionDay[];
  /** `YYYY-MM` shown. */
  month: string;
  monthLabel: string;
  today: string;
  /** Club time `HH:MM:SS`, used for today's step states. */
  now: string;
  title: string;
  description?: string;
  prevHref: string | null;
  nextHref: string | null;
  /** Months to jump to, newest first. */
  months: MonthOption[];
  /** Day selected first; defaults to the most recent day of the month. */
  initialDate?: string;
  /** Who the data is about ("You" / the athlete's first name). */
  subject?: string;
  /** Full-width card: calendar and day detail side by side on large screens. */
  wide?: boolean;
}

export function NutritionHistory({
  days,
  month,
  monthLabel,
  today,
  now,
  title,
  description,
  prevHref,
  nextHref,
  months,
  initialDate,
  subject = 'You',
  wide = false,
}: NutritionHistoryProps) {
  const router = useRouter();
  // Open on the requested day if it is in this month, else on the latest day with something logged.
  const [selected, setSelected] = useState<string | null>(
    initialDate && days.some((d) => d.date === initialDate)
      ? initialDate
      : (days.findLast(logged)?.date ?? days.at(-1)?.date ?? null)
  );
  const day = days.find((d) => d.date === selected) ?? null;

  const plan = planSummary(
    days.map((d) => d.date),
    (date) => days.find((d) => d.date === date)?.steps.length ?? 0,
    new Map(days.map((d) => [d.date, doneCount(d)]))
  );
  const water = hydrationSummary(
    days.map((d) => d.date),
    days
  );
  const trainingDays = days.filter((d) => d.sessions.length > 0).length;
  const loggedDays = days.filter(logged).length;

  return (
    <section
      data-reveal
      aria-labelledby="history-title"
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="history-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
          <CalendarDays className="size-5" />
        </span>
      </div>

      <div
        className={cn(
          wide && 'lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-8'
        )}
      >
        <div>
          {/* Month navigation */}
          <div className="mt-4 flex items-center justify-between gap-2">
            {prevHref ? (
              <Link
                href={prevHref}
                scroll={false}
                aria-label="Previous month"
                className="flex size-9 items-center justify-center rounded-lg border border-border hover:bg-secondary"
              >
                <ChevronLeft className="size-4" />
              </Link>
            ) : (
              <span className="size-9" />
            )}
            <label className="relative">
              <span className="sr-only">Choose a month</span>
              <select
                value={month}
                onChange={(e) => {
                  const option = months.find((o) => o.value === e.target.value);
                  if (option) router.push(option.href, { scroll: false });
                }}
                className="appearance-none rounded-lg bg-transparent px-3 py-1.5 text-center font-display text-base font-semibold text-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                {months.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {nextHref ? (
              <Link
                href={nextHref}
                scroll={false}
                aria-label="Next month"
                className="flex size-9 items-center justify-center rounded-lg border border-border hover:bg-secondary"
              >
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="size-9" />
            )}
          </div>

          <p className="mt-2 text-center text-xs text-muted-foreground">
            {loggedDays === 0
              ? `Nothing logged in ${monthLabel}.`
              : [
                  plan.daysTracked ? `Plan ${plan.pct}%` : 'Plan not used',
                  water.daysTracked ? `water ${water.pct}%` : 'no water logged',
                  `${trainingDays} training day${trainingDays === 1 ? '' : 's'}`,
                  `${loggedDays} day${loggedDays === 1 ? '' : 's'} logged`,
                ].join(' · ')}
          </p>

          <div className="mt-4">
            <MonthCalendar
              month={month}
              days={days}
              today={today}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
        </div>

        <div
          className={cn(
            'mt-5 border-t border-border/70 pt-5',
            wide && 'lg:mt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8'
          )}
        >
          {day ? (
            <DayDetail day={day} today={today} now={now} subject={subject} />
          ) : (
            <p className="text-center text-sm text-muted-foreground">Pick a day to see it.</p>
          )}
        </div>
      </div>
    </section>
  );
}
