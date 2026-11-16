import { FOOD_BY_ID, type FoodGroup } from '@/lib/nutrition/catalog';
import { cn } from '@/lib/utils';

/** One colour per food group, used as a small dot instead of emoji. */
export const GROUP_DOT: Record<FoodGroup, string> = {
  carbs: 'bg-amber-400',
  protein: 'bg-rose-400',
  veg: 'bg-emerald-500',
  fruit: 'bg-lime-400',
  dairy: 'bg-sky-400',
  treat: 'bg-slate-400',
};

export const GROUP_LEGEND: { group: FoodGroup; label: string }[] = [
  { group: 'carbs', label: 'Energy' },
  { group: 'protein', label: 'Protein' },
  { group: 'veg', label: 'Vegetables' },
  { group: 'fruit', label: 'Fruit' },
  { group: 'dairy', label: 'Dairy' },
];

export function FoodDots({ id, className }: { id: string; className?: string }) {
  const groups = FOOD_BY_ID.get(id)?.groups ?? [];
  return (
    <span className={cn('flex -space-x-0.5', className)} aria-hidden>
      {groups.slice(0, 3).map((g) => (
        <span key={g} className={cn('size-2 rounded-full ring-2 ring-current', GROUP_DOT[g])} />
      ))}
    </span>
  );
}

interface FoodChipProps {
  id: string;
  selected?: boolean;
  onToggle?: () => void;
  /** Light chips on the dark hero. */
  dark?: boolean;
  disabled?: boolean;
}

export function FoodChip({
  id,
  selected = false,
  onToggle,
  dark = false,
  disabled = false,
}: FoodChipProps) {
  const name = FOOD_BY_ID.get(id)?.name ?? id;
  const base = cn(
    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
    dark
      ? 'border-white/10 bg-white/5 text-white/85'
      : selected
        ? 'border-blue-600 bg-blue-600 text-white'
        : 'border-border bg-background text-foreground'
  );
  const content = (
    <>
      {/* The ring takes the chip's background colour so overlapping dots stay distinct. */}
      <FoodDots
        id={id}
        className={dark ? 'text-ink-800' : selected ? 'text-blue-600' : 'text-background'}
      />
      <span>{name}</span>
    </>
  );

  if (!onToggle) return <span className={base}>{content}</span>;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        base,
        !selected && 'hover:border-blue-300 hover:bg-blue-50',
        'disabled:pointer-events-none'
      )}
    >
      {content}
    </button>
  );
}
