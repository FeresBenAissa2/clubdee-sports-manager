import { ClipboardList } from 'lucide-react';
import type { FuelStep } from '@/lib/nutrition/plan';
import { macroSplit, sumNutrients, type PortionItem } from '@/lib/nutrition/portions';
import { MacroBar } from './MacroBar';

interface TodayPlanCardProps {
  steps: FuelStep[];
  portions: Record<string, PortionItem[]>;
  doneIds: ReadonlySet<string>;
  /** Calorie numbers only for athletes aged 18+. */
  showNumbers: boolean;
  /** "your coach's team plan" / "a plan made for you". */
  sourceLabel: string;
}

const r = (n: number) => Math.round(n);

/** Today's meal plan at a glance: planned vs ticked. */
export function TodayPlanCard({
  steps,
  portions,
  doneIds,
  showNumbers,
  sourceLabel,
}: TodayPlanCardProps) {
  const meals = steps.filter((s) => (portions[s.id]?.length ?? 0) > 0);
  const eaten = meals.filter((s) => doneIds.has(s.id));
  const planned = sumNutrients(meals.flatMap((s) => portions[s.id]));
  const ticked = sumNutrients(eaten.flatMap((s) => portions[s.id]));
  const pct = planned.kcal > 0 ? Math.min(100, (ticked.kcal / planned.kcal) * 100) : 0;
  const mealPct = meals.length ? (eaten.length / meals.length) * 100 : 0;

  return (
    <section
      data-reveal
      aria-labelledby="today-plan-title"
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="today-plan-title" className="text-lg font-semibold text-foreground">
            {showNumbers ? 'Today’s totals' : 'Your plan today'}
          </h2>
          <p className="text-sm text-muted-foreground">Meal plan: {sourceLabel}.</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
          <ClipboardList className="size-5" />
        </span>
      </div>

      {showNumbers ? (
        <>
          <p className="mt-4 font-display text-3xl font-semibold text-foreground tabular-nums">
            {r(ticked.kcal)}
            <span className="text-base text-muted-foreground"> / {r(planned.kcal)} kcal</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-lime-400 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {(
              [
                ['Protein', ticked.protein, planned.protein],
                ['Carbs', ticked.carbs, planned.carbs],
                ['Fat', ticked.fat, planned.fat],
              ] as const
            ).map(([label, got, goal]) => (
              <div key={label} className="rounded-xl bg-secondary/50 px-2 py-2">
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold text-foreground tabular-nums">
                  {r(got)}
                  <span className="font-normal text-muted-foreground">/{r(goal)} g</span>
                </dd>
              </div>
            ))}
          </dl>
          <MacroBar split={macroSplit(planned)} className="mt-4" />
        </>
      ) : (
        <>
          <p className="mt-4 font-display text-3xl font-semibold text-foreground tabular-nums">
            {eaten.length}
            <span className="text-base text-muted-foreground"> / {meals.length} meals eaten</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-lime-400 transition-[width] duration-500"
              style={{ width: `${mealPct}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Each meal shows the portions your coach set. Tap “Details” to see them in full.
          </p>
        </>
      )}
    </section>
  );
}
