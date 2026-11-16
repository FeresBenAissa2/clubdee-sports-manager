'use client';

import { useState, useTransition } from 'react';
import { Ruler, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveMyBodyMetrics } from '@/lib/nutrition/actions';
import { HEIGHT_RANGE, WEIGHT_RANGE, type EnergyBreakdown, type Sex } from '@/lib/nutrition/energy';

const DATE = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const n = (v: number) => Math.round(v).toLocaleString('en-US');

interface MyBodyCardProps {
  age: number | null;
  sex: Sex | null;
  latest: {
    date: string;
    height_cm: number;
    weight_kg: number;
    recorded_by: 'athlete' | 'coach';
  } | null;
  recommendation: EnergyBreakdown | null;
  /** Level the coach fixed, if any. */
  fixedLevel: number | null;
}

/** Adults only: set or update height and weight, and see how the daily level is calculated. */
export function MyBodyCard({ age, sex, latest, recommendation, fixedLevel }: MyBodyCardProps) {
  const [editing, setEditing] = useState(!latest);
  const [height, setHeight] = useState(latest ? String(latest.height_cm) : '');
  const [weight, setWeight] = useState(latest ? String(latest.weight_kg) : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await saveMyBodyMetrics({ heightCm: height, weightKg: weight });
      if (result.ok) setEditing(false);
      else setError(result.error);
    });

  const profileLine = [
    sex ? (sex === 'male' ? 'Male' : 'Female') : null,
    age !== null ? `${age} years` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section
      data-reveal
      aria-labelledby="my-body-title"
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="my-body-title" className="text-lg font-semibold text-foreground">
            {latest ? 'Body & energy' : 'Personalize your plan'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {latest
              ? `Measured ${DATE.format(new Date(`${latest.date}T00:00:00Z`))}${latest.recorded_by === 'coach' ? ' by your coach' : ''}.`
              : 'Your height and weight set how much you need to eat each day.'}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-100">
          {latest ? <Ruler className="size-5" /> : <Sparkles className="size-5" />}
        </span>
      </div>

      {editing ? (
        <div className="mt-4">
          {profileLine && (
            <p className="mb-3 text-xs text-muted-foreground">{profileLine} — from your profile</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-foreground">
              Height
              <span className="relative mt-1 block">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={HEIGHT_RANGE.min}
                  max={HEIGHT_RANGE.max}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                  className="pr-10"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                  cm
                </span>
              </span>
            </label>
            <label className="text-sm font-medium text-foreground">
              Weight
              <span className="relative mt-1 block">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={WEIGHT_RANGE.min}
                  max={WEIGHT_RANGE.max}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="65"
                  className="pr-10"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                  kg
                </span>
              </span>
            </label>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-rose-600">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            {latest && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            )}
            <Button type="button" onClick={save} disabled={pending || !height || !weight}>
              {pending ? 'Saving…' : latest ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        latest && (
          <div className="mt-4">
            <dl className="grid grid-cols-2 gap-2">
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
            {recommendation && (
              <p className="mt-3 text-sm text-muted-foreground">
                Resting {n(recommendation.bmr)} kcal × {recommendation.activity} (
                {recommendation.hoursPerWeek} h/week, ×{recommendation.factor})
                {recommendation.goalKcal !== 0 &&
                  ` ${recommendation.goalKcal > 0 ? '+' : '−'} ${Math.abs(recommendation.goalKcal)} kcal goal`}{' '}
                ≈{' '}
                <span className="font-semibold text-foreground">
                  {n(recommendation.level)} kcal a day
                </span>
                .
              </p>
            )}
            {fixedLevel && (
              <p className="mt-2 text-sm text-blue-700">
                Your coach set your daily level to {n(fixedLevel)} kcal.
              </p>
            )}
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                Update my data
              </Button>
            </div>
          </div>
        )
      )}
    </section>
  );
}
