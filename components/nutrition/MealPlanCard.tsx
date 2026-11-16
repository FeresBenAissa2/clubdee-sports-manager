import Link from 'next/link';
import { ClipboardList, EyeOff, Pencil } from 'lucide-react';
import type { EffectivePlan } from '@/lib/nutrition/data';
import type { FuelStep } from '@/lib/nutrition/plan';
import { macroSplit, PLAN_STYLES, portionsForSteps, sumNutrients } from '@/lib/nutrition/portions';
import { cn } from '@/lib/utils';
import { MacroBar } from './MacroBar';
import { ResetPlanButton } from './ResetPlanButton';

interface MealPlanCardProps {
  athleteId: string;
  firstName: string;
  plan: EffectivePlan | null;
  /** Today's fuel plan steps, to show today's totals. */
  todaySteps: FuelStep[];
  /** Whether the athlete sees calorie numbers (18+). */
  athleteSeesNumbers: boolean;
}

const r = (n: number) => Math.round(n);

/** The coach's view of an athlete's meal plan, with links to change it. */
export function MealPlanCard({
  athleteId,
  firstName,
  plan,
  todaySteps,
  athleteSeesNumbers,
}: MealPlanCardProps) {
  const editHref = `/dashboard/coach/nutrition/plans/athlete/${athleteId}`;
  const today = plan
    ? sumNutrients([...portionsForSteps(todaySteps, plan.config).values()].flat())
    : null;
  const style = plan ? PLAN_STYLES.find((s) => s.id === plan.config.style) : null;

  return (
    <section
      data-reveal
      aria-labelledby="meal-plan-title"
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="meal-plan-title" className="text-lg font-semibold text-foreground">
            Meal plan
          </h2>
          <p className="text-sm text-muted-foreground">
            {!plan
              ? 'No plan: food ideas only, no portions.'
              : plan.source === 'athlete'
                ? `Made for ${firstName}.`
                : 'Team plan.'}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[11px] font-semibold',
            plan?.source === 'athlete'
              ? 'bg-blue-600 text-white'
              : plan
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100'
                : 'bg-secondary text-muted-foreground'
          )}
        >
          {plan?.source === 'athlete' ? 'Custom' : plan ? 'Team' : 'None'}
        </span>
      </div>

      {plan && today && (
        <div className="mt-4 rounded-xl bg-secondary/50 p-4">
          <p className="font-display text-2xl font-semibold text-foreground tabular-nums">
            {plan.config.level_kcal.toLocaleString('en-US')}
            <span className="text-sm text-muted-foreground"> kcal / day · {style?.label}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Today: {r(today.kcal)} kcal · P {r(today.protein)} g · C {r(today.carbs)} g · F{' '}
            {r(today.fat)} g
          </p>
          <MacroBar split={macroSplit(today)} className="mt-3" />
        </div>
      )}

      {!athleteSeesNumbers && plan && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <EyeOff className="size-3.5" />
          {firstName} is under 18 (or has no birth date): they see portions, not calories.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={editHref}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {plan?.source === 'athlete' ? (
            <Pencil className="size-3.5" />
          ) : (
            <ClipboardList className="size-3.5" />
          )}
          {plan?.source === 'athlete' ? `Edit ${firstName}’s plan` : `Customize for ${firstName}`}
        </Link>
        {plan?.source === 'athlete' && <ResetPlanButton athleteId={athleteId} />}
      </div>
    </section>
  );
}
