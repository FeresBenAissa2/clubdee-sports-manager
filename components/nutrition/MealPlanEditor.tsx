'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Dumbbell,
  Plus,
  RotateCcw,
  Save,
  Scale,
  Trash2,
  Waves,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FOOD_BY_ID, FOODS } from '@/lib/nutrition/catalog';
import { buildFuelPlan, type FuelStep } from '@/lib/nutrition/plan';
import { deleteClubPlan, resetAthletePlan, saveMealPlan } from '@/lib/nutrition/plan-actions';
import {
  MEAL_KINDS,
  MEAL_SHARE,
  PLAN_LEVELS,
  PLAN_STYLES,
  generateMeal,
  itemNutrients,
  macroSplit,
  measureText,
  portionsForSteps,
  sumNutrients,
  type MealKind,
  type MealPlanConfig,
  type PlanStyle,
  type PortionItem,
} from '@/lib/nutrition/portions';
import { cn } from '@/lib/utils';
import { STEP_ICON } from './FuelTimeline';
import { FoodDots } from './FoodChip';
import { MacroBar } from './MacroBar';

const STYLE_ICON: Record<PlanStyle, LucideIcon> = {
  balanced: Scale,
  endurance: Waves,
  strength: Dumbbell,
};

/** Days the coach previews the plan on. */
const PREVIEW = {
  training: {
    label: 'Training day',
    hint: 'Previewed with a 17:30–19:00 session.',
    steps: buildFuelPlan([
      { id: 'preview', title: 'Training', start_time: '17:30:00', end_time: '19:00:00' },
    ]),
  },
  rest: { label: 'Rest day', hint: 'No session that day.', steps: buildFuelPlan([]) },
} as const;
type PreviewDay = keyof typeof PREVIEW;

const KIND_LABEL = new Map(MEAL_KINDS.map((m) => [m.kind, m.label]));
const r = (n: number) => Math.round(n);

interface MealPlanEditorProps {
  scope: 'club' | 'athlete';
  targetId: string;
  /** Saved plan, or the team plan an athlete's plan starts from, or null for a new plan. */
  initial: MealPlanConfig | null;
  /** True when this exact plan exists (offers reset / delete). */
  exists: boolean;
  backHref: string;
  /** For an athlete whose level comes from body data or a coach's fixed level: shown, not edited. */
  levelLock?: { level: number; reason: string; href: string } | null;
}

function MealRows({
  items,
  editable,
  onChange,
}: {
  items: PortionItem[];
  editable: boolean;
  onChange: (items: PortionItem[]) => void;
}) {
  const update = (i: number, patch: Partial<PortionItem>) =>
    onChange(items.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  const unused = FOODS.find((f) => !items.some((i) => i.food_id === f.id));

  return (
    <div>
      <ul className="divide-y divide-border/60">
        {items.map((item, i) => (
          <li
            key={`${item.food_id}-${i}`}
            className="flex flex-wrap items-center gap-2 py-2 sm:flex-nowrap"
          >
            <FoodDots id={item.food_id} className="text-card" />
            {editable ? (
              <select
                value={item.food_id}
                onChange={(e) => update(i, { food_id: e.target.value })}
                aria-label="Food"
                className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
              >
                {FOODS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {FOOD_BY_ID.get(item.food_id)?.name}
              </span>
            )}
            <span className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground sm:block">
              {measureText(item.food_id, item.grams)}
            </span>
            {editable ? (
              <label className="flex shrink-0 items-center gap-1">
                <span className="sr-only">Grams</span>
                <input
                  type="number"
                  min={5}
                  max={1000}
                  step={5}
                  value={item.grams}
                  onChange={(e) => update(i, { grams: Number(e.target.value) || 0 })}
                  className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-right text-sm tabular-nums"
                />
                <span className="text-xs text-muted-foreground">g</span>
              </label>
            ) : (
              <span className="w-16 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
                {item.grams} g
              </span>
            )}
            <span className="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {r(itemNutrients(item).kcal)} kcal
            </span>
            {editable && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove food"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {editable && items.length < 8 && unused && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 text-blue-600"
          onClick={() => onChange([...items, { food_id: unused.id, grams: 100 }])}
        >
          <Plus className="size-3.5" />
          Add food
        </Button>
      )}
    </div>
  );
}

export function MealPlanEditor({
  scope,
  targetId,
  initial,
  exists,
  backHref,
  levelLock = null,
}: MealPlanEditorProps) {
  const router = useRouter();
  const [level, setLevel] = useState<number>(levelLock?.level ?? initial?.level_kcal ?? 2500);
  const [style, setStyle] = useState<PlanStyle>(initial?.style ?? 'balanced');
  const [custom, setCustom] = useState<Partial<Record<MealKind, PortionItem[]>>>(
    initial?.meals ?? {}
  );
  const [day, setDay] = useState<PreviewDay>('training');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const config: MealPlanConfig = { level_kcal: level, style, meals: custom };
  const steps = PREVIEW[day].steps;
  const portions = useMemo(
    () => portionsForSteps(steps, { level_kcal: level, style, meals: custom }),
    [steps, level, style, custom]
  );
  const mealSteps = steps.filter((s): s is FuelStep & { kind: MealKind } => s.kind !== 'during');
  const total = sumNutrients([...portions.values()].flat());
  const diff = (total.kcal - level) / level;
  const invalid = Object.values(custom).some((items) =>
    items?.some((i) => !(i.grams >= 5 && i.grams <= 1000))
  );

  // Meals the preview day does not show (refuel, dinner on a training day…).
  const shown = new Set(mealSteps.map((s) => s.kind));
  const others = MEAL_KINDS.filter((m) => !shown.has(m.kind));

  const setMeal = (kind: MealKind, items: PortionItem[] | null) => {
    setMessage(null);
    setCustom((c) => {
      const next = { ...c };
      if (items) next[kind] = items;
      else delete next[kind];
      return next;
    });
  };

  const save = () =>
    startTransition(async () => {
      const result = await saveMealPlan({
        scope,
        targetId,
        level,
        style,
        meals: config.meals,
      });
      setMessage(
        result.ok
          ? { ok: true, text: 'Plan saved. Athletes see it right away.' }
          : { ok: false, text: result.error }
      );
      if (result.ok) router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      const result =
        scope === 'athlete' ? await resetAthletePlan(targetId) : await deleteClubPlan(targetId);
      if (result.ok) router.push(backHref);
      else setMessage({ ok: false, text: result.error });
    });

  const mealCard = (kind: MealKind, items: PortionItem[], step?: FuelStep) => {
    const isCustom = Boolean(custom[kind]?.length);
    const Icon = STEP_ICON[kind];
    const kcal = sumNutrients(items).kcal;
    return (
      <article
        key={step?.id ?? kind}
        className={cn(
          'rounded-2xl border p-4',
          isCustom ? 'border-blue-200 bg-blue-50/40' : 'border-border/80 bg-card'
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-blue-600">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{KIND_LABEL.get(kind)}</h3>
            <p className="text-xs text-muted-foreground">
              {step ? `${step.start}–${step.end}` : 'Only on some days'} · {r(kcal)} kcal
            </p>
          </div>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              isCustom ? 'bg-blue-600 text-white' : 'bg-secondary text-muted-foreground'
            )}
          >
            {isCustom ? 'Custom' : 'Auto'}
          </span>
          {isCustom ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setMeal(kind, null)}>
              <Wand2 className="size-3.5" />
              Auto-fill
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setMeal(
                  kind,
                  items.map((i) => ({ ...i }))
                )
              }
            >
              Customize
            </Button>
          )}
        </div>
        <MealRows items={items} editable={isCustom} onChange={(next) => setMeal(kind, next)} />
      </article>
    );
  };

  return (
    <div className="space-y-6">
      {/* Level */}
      <section
        data-reveal
        className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft sm:p-6"
      >
        <h2 className="text-lg font-semibold text-foreground">Daily energy level</h2>
        <p className="text-sm text-muted-foreground">
          Meals are filled automatically to match it. Athletes under 18 never see this number, only
          their portions.
        </p>
        {levelLock ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
            <div>
              <p className="font-display text-2xl font-semibold text-foreground tabular-nums">
                {levelLock.level.toLocaleString('en-US')}
                <span className="text-sm text-muted-foreground"> kcal / day</span>
              </p>
              <p className="text-sm text-muted-foreground">{levelLock.reason}</p>
            </div>
            <a
              href={levelLock.href}
              className="text-sm font-semibold text-violet-700 hover:underline"
            >
              Change it in Body &amp; energy
            </a>
          </div>
        ) : (
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Calories per day"
          >
            {PLAN_LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={l === level}
                onClick={() => {
                  setLevel(l);
                  setMessage(null);
                }}
                className={cn(
                  'rounded-xl border px-4 py-2 text-sm font-semibold tabular-nums transition-colors',
                  l === level
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50'
                )}
              >
                {l.toLocaleString('en-US')} kcal
              </button>
            ))}
          </div>
        )}

        <h3 className="mt-6 text-sm font-semibold text-foreground">Style</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Plan style">
          {PLAN_STYLES.map((s) => {
            const Icon = STYLE_ICON[s.id];
            const active = s.id === style;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setStyle(s.id);
                  setMessage(null);
                }}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                  active
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                    : 'border-border bg-background hover:border-blue-300'
                )}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    active ? 'bg-blue-600 text-white' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Meals */}
      <section
        data-reveal
        className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft sm:p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Meals</h2>
            <p className="text-sm text-muted-foreground">
              “Auto” meals follow the level. “Customize” a meal to set exact foods and grams; it
              then applies on every day that has this meal.
            </p>
          </div>
          <div
            className="inline-flex rounded-xl bg-secondary p-1"
            role="tablist"
            aria-label="Preview day"
          >
            {(Object.keys(PREVIEW) as PreviewDay[]).map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === day}
                onClick={() => setDay(d)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                  d === day
                    ? 'bg-card text-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {PREVIEW[d].label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{PREVIEW[day].hint}</p>

        <div className="mt-4 space-y-3">
          {mealSteps.map((step) => mealCard(step.kind, portions.get(step.id) ?? [], step))}
        </div>

        {others.length > 0 && (
          <details className="mt-4 rounded-xl border border-dashed border-border p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Meals used on other days ({others.map((o) => o.label.split(' (')[0]).join(', ')})
            </summary>
            <div className="mt-3 space-y-3">
              {others.map(({ kind }) =>
                mealCard(
                  kind,
                  custom[kind]?.length
                    ? custom[kind]!
                    : generateMeal(kind, (level * MEAL_SHARE[kind]) / 100, style)
                )
              )}
            </div>
          </details>
        )}
      </section>

      {/* Totals + actions */}
      <div className="sticky bottom-3 z-10 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-lg backdrop-blur sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{PREVIEW[day].label} total</p>
            <p className="font-display text-2xl font-semibold text-foreground tabular-nums">
              {r(total.kcal).toLocaleString('en-US')}
              <span className="text-sm text-muted-foreground">
                {' '}
                / {level.toLocaleString('en-US')} kcal · P {r(total.protein)} g · C {r(total.carbs)}{' '}
                g · F {r(total.fat)} g
              </span>
            </p>
            <MacroBar split={macroSplit(total)} className="mt-2 max-w-md" />
            {Math.abs(diff) > 0.1 && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
                <AlertTriangle className="size-4" />
                {diff > 0 ? `${r(diff * 100)}% above` : `${r(-diff * 100)}% below`} the level: check
                the custom meals.
              </p>
            )}
            {message && (
              <p
                role={message.ok ? 'status' : 'alert'}
                className={cn(
                  'mt-2 flex items-center gap-1.5 text-sm',
                  message.ok ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {message.ok && <CheckCircle2 className="size-4" />}
                {message.text}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {exists && (
              <Button type="button" variant="ghost" onClick={remove} disabled={pending}>
                <RotateCcw className="size-4" />
                {scope === 'athlete' ? 'Back to team plan' : 'Remove team plan'}
              </Button>
            )}
            <Button type="button" onClick={save} disabled={pending || invalid}>
              <Save className="size-4" />
              {pending ? 'Saving…' : 'Save plan'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
