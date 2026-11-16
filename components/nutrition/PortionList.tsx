import { FOOD_BY_ID } from '@/lib/nutrition/catalog';
import { itemNutrients, measureText, type PortionItem } from '@/lib/nutrition/portions';
import { cn } from '@/lib/utils';
import { FoodDots } from './FoodChip';

interface PortionListProps {
  items: PortionItem[];
  /** Per-item calories; only for coaches and athletes aged 18+. */
  showNumbers?: boolean;
  /** Light text for the dark hero. */
  dark?: boolean;
  className?: string;
}

/** A meal's foods with grams and a household measure ("350 g · ≈ 1 plate"). */
export function PortionList({
  items,
  showNumbers = false,
  dark = false,
  className,
}: PortionListProps) {
  return (
    <ul className={cn('divide-y', dark ? 'divide-white/10' : 'divide-border/60', className)}>
      {items.map((item) => {
        const food = FOOD_BY_ID.get(item.food_id);
        return (
          <li key={item.food_id} className="flex items-center gap-2.5 py-1.5 text-sm">
            <FoodDots id={item.food_id} className={dark ? 'text-ink-800' : 'text-card'} />
            <span
              className={cn('min-w-0 flex-1 truncate', dark ? 'text-white/90' : 'text-foreground')}
            >
              {food?.name ?? item.food_id}
            </span>
            <span
              className={cn(
                'shrink-0 text-xs whitespace-nowrap',
                dark ? 'text-white/50' : 'text-muted-foreground'
              )}
            >
              {measureText(item.food_id, item.grams)}
            </span>
            <span
              className={cn(
                'w-14 shrink-0 text-right font-semibold tabular-nums',
                dark ? 'text-white' : 'text-foreground'
              )}
            >
              {item.grams} g
            </span>
            {showNumbers && (
              <span
                className={cn(
                  'w-16 shrink-0 text-right text-xs tabular-nums',
                  dark ? 'text-white/50' : 'text-muted-foreground'
                )}
              >
                {Math.round(itemNutrients(item).kcal)} kcal
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
