'use client';

import { useState } from 'react';
import {
  Apple,
  BatteryCharging,
  Check,
  GlassWater,
  Moon,
  RefreshCw,
  RotateCcw,
  Sun,
  Sunrise,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FuelStep, StepKind, StepStatus } from '@/lib/nutrition/plan';
import { cn } from '@/lib/utils';
import { FoodChip, GROUP_DOT, GROUP_LEGEND } from './FoodChip';

export const STEP_ICON: Record<StepKind, LucideIcon> = {
  breakfast: Sunrise,
  lunch: Sun,
  snack: Apple,
  dinner: Moon,
  pre_meal: UtensilsCrossed,
  pre_snack: Zap,
  during: GlassWater,
  recovery: BatteryCharging,
  refuel: RefreshCw,
};

export const tickLabel = (step: FuelStep) => (step.kind === 'during' ? 'Bottle ready' : 'I ate it');

const TRAINING_KINDS = new Set<StepKind>(['pre_meal', 'pre_snack', 'during', 'recovery', 'refuel']);

interface StepRowProps {
  step: FuelStep;
  status: StepStatus;
  last: boolean;
  busy: boolean;
  sessionTitle?: string;
  onTick: (items: string[]) => void;
  onUndo: () => void;
}

function StepRow({ step, status, last, busy, sessionTitle, onTick, onUndo }: StepRowProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const Icon = STEP_ICON[step.kind];
  const done = status === 'done';
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <li className="relative grid grid-cols-[3rem_1.75rem_1fr] gap-x-3 sm:grid-cols-[3.5rem_1.75rem_1fr]">
      <div className="pt-4 text-right">
        <p
          className={cn(
            'text-sm font-semibold tabular-nums',
            status === 'now' ? 'text-blue-600' : 'text-foreground'
          )}
        >
          {step.start}
        </p>
        <p className="text-[11px] tabular-nums text-muted-foreground">{step.end}</p>
      </div>

      <div className="relative flex justify-center">
        {!last && <span className="absolute top-9 -bottom-4 w-px bg-border" aria-hidden />}
        <span
          className={cn(
            'relative mt-4 flex size-7 items-center justify-center rounded-full ring-4 ring-card',
            done && 'bg-lime-300 text-ink-950',
            status === 'now' && 'bg-blue-600 text-white',
            status === 'upcoming' && 'border border-border bg-card text-muted-foreground',
            status === 'missed' && 'bg-slate-100 text-slate-400'
          )}
        >
          {status === 'now' && (
            <span
              className="absolute inset-0 animate-ping rounded-full bg-blue-500/40"
              aria-hidden
            />
          )}
          {done ? (
            <Check className="relative size-4" strokeWidth={3} />
          ) : (
            <Icon className="relative size-3.5" />
          )}
        </span>
      </div>

      <article
        className={cn(
          'mb-3 rounded-2xl border p-4 transition-colors',
          status === 'now' && 'border-blue-200 bg-blue-50/60 shadow-sm shadow-blue-600/5',
          status === 'upcoming' && 'border-border/80 bg-card',
          done && 'border-lime-200 bg-lime-50/60',
          status === 'missed' && 'border-dashed border-border bg-secondary/30'
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={cn(
              'font-semibold',
              status === 'missed' ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            {step.title}
          </h3>
          {status === 'now' && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase">
              Now
            </span>
          )}
          {done && (
            <span className="rounded-full bg-lime-300 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-ink-950 uppercase">
              Done
            </span>
          )}
          {TRAINING_KINDS.has(step.kind) && sessionTitle && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {sessionTitle}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {status === 'missed' ? 'Missed it? No worries — tick it if you ate later.' : step.why}
        </p>

        {step.foods.length > 0 && !done && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Ideas — tap what you ate">
            {step.foods.map((id) => (
              <FoodChip
                key={id}
                id={id}
                selected={picked.includes(id)}
                onToggle={() => toggle(id)}
                disabled={busy}
              />
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {done
              ? 'Nice work.'
              : step.foods.length > 0
                ? picked.length > 0
                  ? `${picked.length} selected`
                  : 'Tap what you ate (optional)'
                : null}
          </p>
          {done ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={busy}
              className="text-muted-foreground"
            >
              <RotateCcw className="size-3.5" />
              Undo
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant={status === 'now' ? 'default' : 'outline'}
              onClick={() => onTick(picked)}
              disabled={busy}
            >
              <Check className="size-3.5" />
              {tickLabel(step)}
            </Button>
          )}
        </div>
      </article>
    </li>
  );
}

interface FuelTimelineProps {
  steps: FuelStep[];
  statuses: Map<string, StepStatus>;
  busyId: string | null;
  sessionTitles: Map<string, string>;
  restDay: boolean;
  action?: React.ReactNode;
  onTick: (step: FuelStep, items: string[]) => void;
  onUndo: (step: FuelStep) => void;
}

export function FuelTimeline({
  steps,
  statuses,
  busyId,
  sessionTitles,
  restDay,
  action,
  onTick,
  onUndo,
}: FuelTimelineProps) {
  return (
    <section
      id="fuel-plan"
      data-reveal
      aria-labelledby="fuel-plan-title"
      className="scroll-mt-24 rounded-2xl border border-border/80 bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="fuel-plan-title" className="text-lg font-semibold text-foreground">
            Today&apos;s plan
          </h2>
          <p className="text-sm text-muted-foreground">
            {restDay
              ? 'No training today: regular meals to recover well.'
              : 'Built from your training schedule.'}
          </p>
        </div>
        {action}
      </div>

      <ol aria-label="Fuel plan for today">
        {steps.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            status={statuses.get(step.id) ?? 'upcoming'}
            last={i === steps.length - 1}
            busy={busyId === step.id}
            sessionTitle={step.sessionId ? sessionTitles.get(step.sessionId) : undefined}
            onTick={(items) => onTick(step, items)}
            onUndo={() => onUndo(step)}
          />
        ))}
      </ol>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        {GROUP_LEGEND.map(({ group, label }) => (
          <span key={group} className="inline-flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', GROUP_DOT[group])} aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
