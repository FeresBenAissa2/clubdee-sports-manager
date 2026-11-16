import { cn } from '@/lib/utils';

const PARTS = [
  { key: 'carbs', label: 'Carbs', bar: 'bg-amber-400' },
  { key: 'protein', label: 'Protein', bar: 'bg-rose-400' },
  { key: 'fat', label: 'Fat', bar: 'bg-sky-400' },
] as const;

/** Share of energy from carbs, protein and fat as one stacked bar with a legend. */
export function MacroBar({
  split,
  className,
}: {
  split: { protein: number; carbs: number; fat: number };
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
        {PARTS.map((p) => (
          <span key={p.key} className={cn('h-full', p.bar)} style={{ width: `${split[p.key]}%` }} />
        ))}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
        {PARTS.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1">
            <span className={cn('size-2 rounded-full', p.bar)} />
            {p.label} {split[p.key]}%
          </span>
        ))}
      </p>
    </div>
  );
}
