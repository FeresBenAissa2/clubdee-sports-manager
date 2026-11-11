import type { LucideIcon } from 'lucide-react';
import { CountUp } from '@/components/motion/CountUp';
import { TONES, type Tone } from '@/components/dashboard/tones';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description?: string;
  tone?: Tone;
  suffix?: string;
  /** Mark as a `Reveal` target; only set when rendered inside `<Reveal>`. */
  reveal?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  tone = 'brand',
  suffix,
  reveal = false,
  className,
}: StatCardProps) {
  return (
    <div
      data-reveal={reveal ? '' : undefined}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-soft transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
            TONES[tone]
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
        <CountUp value={value} suffix={suffix} />
      </p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      <div className="pointer-events-none absolute -right-10 -bottom-10 size-32 rounded-full bg-blue-500/[0.06] blur-2xl transition-opacity duration-500 group-hover:bg-blue-500/10" />
    </div>
  );
}
