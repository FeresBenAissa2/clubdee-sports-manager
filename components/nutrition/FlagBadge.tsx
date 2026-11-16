import type { TeamFlag } from '@/lib/nutrition/tips';
import { cn } from '@/lib/utils';

export const FLAG_LABEL: Record<TeamFlag, string> = {
  low_energy: 'Low energy',
  low_hydration: 'Low hydration',
  not_logging: 'Not logging',
};

const LIGHT: Record<TeamFlag, string> = {
  low_energy: 'bg-rose-50 text-rose-700 ring-rose-100',
  low_hydration: 'bg-amber-50 text-amber-700 ring-amber-100',
  not_logging: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const DARK: Record<TeamFlag, string> = {
  low_energy: 'bg-rose-400/15 text-rose-200 ring-rose-300/30',
  low_hydration: 'bg-amber-300/15 text-amber-100 ring-amber-200/30',
  not_logging: 'bg-white/10 text-white/75 ring-white/20',
};

export function FlagBadge({ flag, dark = false }: { flag: TeamFlag; dark?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        (dark ? DARK : LIGHT)[flag]
      )}
    >
      {FLAG_LABEL[flag]}
    </span>
  );
}
