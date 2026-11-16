import Link from 'next/link';
import { ArrowUpRight, CalendarClock, Moon } from 'lucide-react';
import { toClock, toMinutes, type PlanSession } from '@/lib/nutrition/plan';
import { cn } from '@/lib/utils';

function advice(sessions: PlanSession[]): { title: string; body: string; training: boolean } {
  const first = sessions.find((s) => s.start_time);
  if (sessions.length === 0) {
    return {
      title: 'Rest day tomorrow',
      body: 'Keep your water steady and eat regular meals. Rest is part of training.',
      training: false,
    };
  }
  if (!first) {
    return {
      title: 'Training tomorrow',
      body: 'The time is not set yet. Check your schedule so you can plan your meals.',
      training: true,
    };
  }
  const start = toMinutes(first.start_time!);
  const at = toClock(start);
  if (start < 9 * 60) {
    return {
      title: `Early training tomorrow · ${at}`,
      body: 'Get a light snack ready tonight (dates, a fruit) and go to bed early. Have a recovery breakfast after.',
      training: true,
    };
  }
  return {
    title: `Training tomorrow · ${at}`,
    body: `Plan your energy meal around ${toClock(start - 180)} and pack a snack and a water bottle.`,
    training: true,
  };
}

export function TomorrowCard({ sessions }: { sessions: PlanSession[] }) {
  const { title, body, training } = advice(sessions);
  const Icon = training ? CalendarClock : Moon;
  return (
    <Link
      href="/dashboard/athlete/schedule"
      data-reveal
      className="group flex items-start gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-soft transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/5"
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
          training
            ? 'bg-blue-50 text-blue-600 ring-blue-100'
            : 'bg-violet-50 text-violet-600 ring-violet-100'
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Looking ahead
        </span>
        <span className="mt-0.5 block font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-600" />
    </Link>
  );
}
