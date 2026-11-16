'use client';

import { useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';
import { checkPlanStep, uncheckPlanStep } from '@/lib/nutrition/actions';
import { clockNow } from '@/lib/nutrition/dates';
import { focusStep, stepStatus, type FuelStep, type PlanSession } from '@/lib/nutrition/plan';
import type { PortionItem } from '@/lib/nutrition/portions';
import { FuelHero } from './FuelHero';
import { FuelTimeline } from './FuelTimeline';
import { TodayPlanCard } from './TodayPlanCard';

interface FuelTodayProps {
  steps: FuelStep[];
  sessions: PlanSession[];
  done: string[];
  /** Club time (`HH:MM:SS`) when the page was rendered, so server and browser agree on first paint. */
  initialNow: string;
  /** Club time zone; the browser's own zone may differ. */
  timeZone: string;
  dateLabel: string;
  /** Rendered in the plan header (the "log a meal" dialog). */
  planAction?: React.ReactNode;
  /** Under the plan, left column. */
  below?: React.ReactNode;
  /** Right column. */
  aside?: React.ReactNode;
  /** Portions per step id from the coach's meal plan; null without a plan. */
  portions: Record<string, PortionItem[]> | null;
  /** Where the plan comes from, for the totals card. */
  planSource: string | null;
  /** Calorie numbers only for athletes aged 18+. */
  showNumbers: boolean;
}

type Change = { id: string; done: boolean };

export function FuelToday({
  steps,
  sessions,
  done,
  initialNow,
  timeZone,
  dateLabel,
  planAction,
  below,
  aside,
  portions,
  planSource,
  showNumbers,
}: FuelTodayProps) {
  const [now, setNow] = useState(initialNow);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const tick = () => setNow(clockNow(new Date(), timeZone));
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [timeZone]);

  const saved = useMemo(() => new Set(done), [done]);
  const [doneIds, applyChange] = useOptimistic(saved, (current: Set<string>, change: Change) => {
    const next = new Set(current);
    if (change.done) next.add(change.id);
    else next.delete(change.id);
    return next;
  });

  const run = (step: FuelStep, makeDone: boolean, items: string[] = []) => {
    setError(null);
    setBusyId(step.id);
    startTransition(async () => {
      applyChange({ id: step.id, done: makeDone });
      const result = makeDone
        ? await checkPlanStep(step.id, items)
        : await uncheckPlanStep(step.id);
      if (!result.ok) setError(result.error);
      setBusyId(null);
    });
  };

  const statuses = new Map(steps.map((s) => [s.id, stepStatus(s, now, doneIds.has(s.id))]));
  const focus = focusStep(steps, now, doneIds);
  const sessionTitles = new Map(sessions.map((s) => [s.id, s.title]));

  return (
    <>
      <FuelHero
        dateLabel={dateLabel}
        now={now}
        sessions={sessions}
        focus={focus}
        focusStatus={focus ? (statuses.get(focus.id) ?? null) : null}
        doneCount={steps.filter((s) => doneIds.has(s.id)).length}
        total={steps.length}
        busy={focus !== null && busyId === focus.id}
        error={error}
        focusPortions={focus ? (portions?.[focus.id] ?? null) : null}
        showNumbers={showNumbers}
        onTick={(step) => run(step, true)}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <FuelTimeline
            steps={steps}
            statuses={statuses}
            busyId={busyId}
            sessionTitles={sessionTitles}
            restDay={sessions.length === 0}
            action={planAction}
            portions={portions}
            showNumbers={showNumbers}
            onTick={(step, items) => run(step, true, items)}
            onUndo={(step) => run(step, false)}
          />
          {below}
        </div>
        <div className="space-y-6 lg:col-span-2">
          {portions && (
            <TodayPlanCard
              steps={steps}
              portions={portions}
              doneIds={doneIds}
              showNumbers={showNumbers}
              sourceLabel={planSource ?? 'set by your coach'}
            />
          )}
          {aside}
        </div>
      </div>
    </>
  );
}
