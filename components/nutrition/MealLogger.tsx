'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  Apple,
  BatteryCharging,
  CheckCircle2,
  Lightbulb,
  Moon,
  Search,
  Sun,
  Sunrise,
  Trash2,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteMeal, logMeal } from '@/lib/nutrition/actions';
import {
  FOODS,
  FOOD_BY_ID,
  MEAL_TYPES,
  NOTE_MAX,
  plateFeedback,
  type MealType,
} from '@/lib/nutrition/catalog';
import { cn } from '@/lib/utils';
import { FoodChip } from './FoodChip';

export interface LoggedMeal {
  id: string;
  meal_type: MealType;
  items: string[];
  note: string;
}

const MEAL_LABEL = new Map(MEAL_TYPES.map((m) => [m.id, m.label]));

export const MEAL_ICON: Record<MealType, LucideIcon> = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  snack: Apple,
  pre_training: Zap,
  post_training: BatteryCharging,
};

interface MealLoggerProps {
  meals: LoggedMeal[];
  /** Inside a dialog: no card frame or title, the dialog provides them. */
  embedded?: boolean;
  onSaved?: () => void;
}

export function MealLogger({ meals, embedded = false, onSaved }: MealLoggerProps) {
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? FOODS.filter((f) => f.name.toLowerCase().includes(q)) : FOODS;
  }, [query]);

  const toggle = (id: string) =>
    setItems((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );

  const feedback = items.length > 0 ? plateFeedback(items) : null;

  const submit = () => {
    if (!mealType) {
      setError('Choose when you ate.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await logMeal({ mealType, items, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems([]);
      setNote('');
      setQuery('');
      setMealType(null);
      onSaved?.();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await deleteMeal(id);
      if (!result.ok) setError(result.error);
    });
  };

  const body = (
    <>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground">When?</legend>
        <div className="grid grid-cols-3 gap-2">
          {MEAL_TYPES.map((m) => {
            const Icon = MEAL_ICON[m.id];
            const active = mealType === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => setMealType(m.id)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors sm:text-sm',
                  active
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50'
                )}
              >
                <Icon className="size-4" />
                {m.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium text-foreground">What?</legend>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a dish (couscous, lablabi…)"
            aria-label="Search a dish"
            className="pl-9"
          />
        </div>
        <div className="flex max-h-52 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {visibleFoods.map((f) => (
            <FoodChip
              key={f.id}
              id={f.id}
              selected={items.includes(f.id)}
              onToggle={() => toggle(f.id)}
            />
          ))}
          {visibleFoods.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Not in the list? Write it in the note below.
            </p>
          )}
        </div>
      </fieldset>

      <label className="mt-5 block text-sm font-medium text-foreground" htmlFor="meal-note">
        Note <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <Input
        id="meal-note"
        value={note}
        maxLength={NOTE_MAX}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. homemade, big portion, ate late…"
        className="mt-1.5"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {feedback ? (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
              feedback.balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            )}
          >
            {feedback.balanced ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Lightbulb className="size-4" />
            )}
            {feedback.hint}
          </span>
        ) : (
          <span />
        )}
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? 'Saving…' : 'Save meal'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="mt-6 border-t border-border/70 pt-4">
        <h3 className="text-sm font-semibold text-foreground">Logged today ({meals.length})</h3>
        {meals.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing logged yet today.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {meals.map((meal) => {
              const Icon = MEAL_ICON[meal.meal_type] ?? UtensilsCrossed;
              const label = MEAL_LABEL.get(meal.meal_type) ?? 'Meal';
              const fb = meal.items.length > 0 ? plateFeedback(meal.items) : null;
              return (
                <li key={meal.id} className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-blue-600 ring-1 ring-border">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {label}
                      {fb?.balanced && (
                        <span className="ml-2 text-xs font-medium text-emerald-600">Balanced</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {meal.items.map((id) => FOOD_BY_ID.get(id)?.name ?? id).join(', ')}
                      {meal.note && (meal.items.length ? ` — ${meal.note}` : meal.note)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${label}`}
                    onClick={() => remove(meal.id)}
                    disabled={pending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  if (embedded) return <div>{body}</div>;

  return (
    <section
      data-reveal
      aria-labelledby="meals-title"
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="meals-title" className="text-lg font-semibold text-foreground">
            Log a meal
          </h2>
          <p className="text-sm text-muted-foreground">Tap what you ate — no grams, no calories.</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
          <UtensilsCrossed className="size-5" />
        </span>
      </div>
      {body}
    </section>
  );
}
