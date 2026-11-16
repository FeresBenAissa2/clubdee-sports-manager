'use client';

import { useState, useTransition } from 'react';
import { Activity, Plus, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AthleteEnergy } from '@/lib/nutrition/data';
import { GOALS, HEIGHT_RANGE, WEIGHT_RANGE, type Goal } from '@/lib/nutrition/energy';
import { recordBodyMetrics, saveEnergySettings } from '@/lib/nutrition/plan-actions';
import { PLAN_LEVELS } from '@/lib/nutrition/portions';
import { cn } from '@/lib/utils';

const DATE = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const fmtDate = (key: string) => DATE.format(new Date(`${key}T00:00:00Z`));
const n = (v: number) => Math.round(v).toLocaleString('en-US');

interface BodyEnergyCardProps {
  athleteId: string;
  firstName: string;
  isMinor: boolean;
  energy: AthleteEnergy;
  /** Level of the athlete's meal plan (own or team), used when there is no body data. */
  planLevel: number | null;
  today: string;
}

/** Small weight trend for the coach, oldest to newest. */
function WeightSparkline({ weights }: { weights: number[] }) {
  if (weights.length < 2) return null;
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 1;
  const points = weights
    .map((w, i) => `${(i / (weights.length - 1)) * 100},${28 - ((w - min) / span) * 24}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={points}
        fill="none"
        strokeWidth="2"
        className="stroke-violet-500"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function BodyEnergyCard({
  athleteId,
  firstName,
  isMinor,
  energy,
  planLevel,
  today,
}: BodyEnergyCardProps) {
  const latest = energy.metrics[0] ?? null;
  const rec = energy.recommendation;

  const [recording, setRecording] = useState(false);
  const [height, setHeight] = useState(latest ? String(latest.height_cm) : '');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(today);
  const [goal, setGoal] = useState<Goal>(energy.goal);
  const [mode, setMode] = useState<'auto' | 'fixed'>(energy.levelMode);
  const [fixed, setFixed] = useState<number>(energy.fixedLevel ?? rec?.level ?? planLevel ?? 2500);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const record = () =>
    startTransition(async () => {
      const result = await recordBodyMetrics({
        athleteId,
        heightCm: height,
        weightKg: weight,
        date,
      });
      setMessage(
        result.ok ? { ok: true, text: 'Measurement saved.' } : { ok: false, text: result.error }
      );
      if (result.ok) {
        setRecording(false);
        setWeight('');
      }
    });

  const saveSettings = () =>
    startTransition(async () => {
      const result = await saveEnergySettings({
        athleteId,
        goal,
        levelMode: mode,
        fixedLevel: fixed,
      });
      setMessage(
        result.ok ? { ok: true, text: 'Energy settings saved.' } : { ok: false, text: result.error }
      );
    });

  const used = mode === 'fixed' ? fixed : (rec?.level ?? planLevel);
  const changed =
    goal !== energy.goal ||
    mode !== energy.levelMode ||
    (mode === 'fixed' && fixed !== energy.fixedLevel);
  const history = [...energy.metrics].reverse();

  return (
    <section
      data-reveal
      aria-labelledby="body-energy-title"
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="body-energy-title" className="text-lg font-semibold text-foreground">
            Body & energy
          </h2>
          <p className="text-sm text-muted-foreground">
            {[
              energy.sex ? (energy.sex === 'male' ? 'Male' : 'Female') : 'Sex not set',
              energy.age !== null ? `${energy.age} years` : 'no birth date',
            ].join(' · ')}
            {isMinor && ' · under 18'}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-100">
          <Ruler className="size-5" />
        </span>
      </div>

      {/* Measurements */}
      <div className="mt-4">
        {latest ? (
          <div className="flex items-end gap-4">
            <dl className="grid flex-1 grid-cols-2 gap-2">
              <div className="rounded-xl bg-secondary/50 px-3 py-2">
                <dt className="text-[11px] text-muted-foreground">Height</dt>
                <dd className="font-display text-xl font-semibold text-foreground tabular-nums">
                  {latest.height_cm} <span className="text-sm text-muted-foreground">cm</span>
                </dd>
              </div>
              <div className="rounded-xl bg-secondary/50 px-3 py-2">
                <dt className="text-[11px] text-muted-foreground">Weight</dt>
                <dd className="font-display text-xl font-semibold text-foreground tabular-nums">
                  {latest.weight_kg} <span className="text-sm text-muted-foreground">kg</span>
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            No height or weight yet
            {isMinor
              ? ` — as ${firstName} is under 18, only you can record them.`
              : ` — ${firstName} can add them, or you can record them here.`}
          </p>
        )}
        {latest && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Last measured {fmtDate(latest.date)} by{' '}
            {latest.recorded_by === 'coach' ? 'a coach' : firstName}
          </p>
        )}

        {history.length >= 2 && (
          <div className="mt-3 rounded-xl bg-secondary/40 p-3">
            <div className="flex items-baseline justify-between text-xs text-muted-foreground">
              <span>Weight, last {history.length} measurements</span>
              <span className="tabular-nums">
                {history[0].weight_kg} → {history.at(-1)!.weight_kg} kg
              </span>
            </div>
            <WeightSparkline weights={history.map((m) => m.weight_kg)} />
          </div>
        )}

        {recording ? (
          <div className="mt-3 rounded-xl border border-border p-3">
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs font-medium text-foreground">
                Height (cm)
                <Input
                  type="number"
                  min={HEIGHT_RANGE.min}
                  max={HEIGHT_RANGE.max}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="mt-1"
                />
              </label>
              <label className="text-xs font-medium text-foreground">
                Weight (kg)
                <Input
                  type="number"
                  step="0.1"
                  min={WEIGHT_RANGE.min}
                  max={WEIGHT_RANGE.max}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="mt-1"
                />
              </label>
              <label className="text-xs font-medium text-foreground">
                Date
                <Input
                  type="date"
                  max={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRecording(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={record}
                disabled={pending || !height || !weight}
              >
                Save measurement
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setRecording(true)}
          >
            <Plus className="size-3.5" />
            Record measurement
          </Button>
        )}
      </div>

      {/* Calculation */}
      <div className="mt-5 border-t border-border/70 pt-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Activity className="size-4 text-violet-600" />
          Daily energy need
        </h3>
        {rec ? (
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Resting ({rec.formula})</dt>
              <dd className="font-medium text-foreground tabular-nums">{n(rec.bmr)} kcal</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">
                Training {rec.hoursPerWeek} h/week ({rec.activity})
              </dt>
              <dd className="font-medium text-foreground tabular-nums">× {rec.factor}</dd>
            </div>
            {rec.goalKcal !== 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Goal</dt>
                <dd className="font-medium text-foreground tabular-nums">
                  {rec.goalKcal > 0 ? '+' : '−'}
                  {Math.abs(rec.goalKcal)} kcal
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-border/60 pt-1">
              <dt className="text-muted-foreground">≈ {n(rec.raw)} kcal → nearest level</dt>
              <dd className="font-display text-lg font-semibold text-foreground tabular-nums">
                {n(rec.level)} kcal
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {energy.age === null
              ? 'Add a birth date to the athlete profile to calculate it.'
              : 'Record a height and weight to calculate it.'}{' '}
            {planLevel ? `Until then the plan level (${n(planLevel)} kcal) is used.` : ''}
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="mt-5 border-t border-border/70 pt-4">
        <label className="block text-sm font-medium text-foreground">
          Goal
          <select
            value={isMinor ? 'maintain' : goal}
            disabled={isMinor}
            onChange={(e) => setGoal(e.target.value as Goal)}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60"
          >
            {GOALS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
                {g.kcal ? ` (${g.kcal > 0 ? '+' : '−'}${Math.abs(g.kcal)} kcal)` : ''}
              </option>
            ))}
          </select>
        </label>
        {isMinor && (
          <p className="mt-1 text-xs text-muted-foreground">
            Under 18: always maintain, growth needs energy.
          </p>
        )}

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-foreground">Daily level</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(['auto', 'fixed'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                  mode === m
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                    : 'border-border hover:border-blue-300'
                )}
              >
                <span className="block font-semibold text-foreground">
                  {m === 'auto' ? 'Automatic' : 'Fixed'}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {m === 'auto' ? 'From body data and training' : 'You choose the level'}
                </span>
              </button>
            ))}
          </div>
          {mode === 'fixed' && (
            <select
              value={fixed}
              onChange={(e) => setFixed(Number(e.target.value))}
              aria-label="Fixed level"
              className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              {PLAN_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {n(l)} kcal
                </option>
              ))}
            </select>
          )}
        </fieldset>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Used:{' '}
            <span className="font-semibold text-foreground">
              {used ? `${n(used)} kcal` : 'no level yet'}
            </span>
          </p>
          <Button type="button" size="sm" onClick={saveSettings} disabled={pending || !changed}>
            Save settings
          </Button>
        </div>
        {message && (
          <p
            role={message.ok ? 'status' : 'alert'}
            className={cn('mt-2 text-sm', message.ok ? 'text-emerald-600' : 'text-rose-600')}
          >
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
}
