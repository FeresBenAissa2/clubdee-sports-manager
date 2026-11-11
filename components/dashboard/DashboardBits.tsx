import Link from 'next/link';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { TONES, type Tone } from '@/components/dashboard/tones';
import { cn } from '@/lib/utils';

/* All components here carry `data-reveal`, so render them inside <Reveal>. */

export const bannerPrimaryAction =
  'inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-ink-950 shadow-lg shadow-black/20 transition-transform hover:scale-[1.03] active:scale-[0.98]';

export const bannerSecondaryAction =
  'inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10';

interface WelcomeBannerProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  initials?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function WelcomeBanner({
  eyebrow,
  title,
  description,
  initials,
  actions,
  children,
}: WelcomeBannerProps) {
  return (
    <section
      data-reveal
      className="relative overflow-hidden rounded-3xl bg-ink-radial p-6 text-white shadow-xl shadow-blue-950/10 sm:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-dark mask-fade-b opacity-70" />
      <div className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          {initials && (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-violet-600 font-display text-xl font-semibold shadow-lg shadow-blue-950/40 ring-1 ring-white/20">
              {initials}
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs font-semibold tracking-[0.16em] text-blue-200/80 uppercase">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
            {description && <p className="mt-1.5 text-[15px] text-white/60">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-6">{children}</div>}
    </section>
  );
}

interface ActionTileProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: Tone;
  badge?: number;
}

export function ActionTile({
  href,
  icon: Icon,
  title,
  description,
  tone = 'brand',
  badge = 0,
}: ActionTileProps) {
  return (
    <Link
      href={href}
      data-reveal
      className="group relative flex items-start gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-soft transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/5"
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105',
          TONES[tone]
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold text-foreground">
          {title}
          {badge > 0 && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-600" />
    </Link>
  );
}

interface SectionTitleProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionTitle({ title, description, action }: SectionTitleProps) {
  return (
    <div data-reveal className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
