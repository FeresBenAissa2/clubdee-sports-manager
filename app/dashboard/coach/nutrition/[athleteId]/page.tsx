import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  BatteryCharging,
  Droplet,
  ListChecks,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { bannerSecondaryAction, WelcomeBanner } from '@/components/dashboard/DashboardBits';
import { Reveal } from '@/components/motion/Reveal';
import { CheckInTrend } from '@/components/nutrition/CheckInTrend';
import { FlagBadge } from '@/components/nutrition/FlagBadge';
import { NutritionHistory } from '@/components/nutrition/NutritionHistory';
import { WeeklyTrend } from '@/components/nutrition/WeeklyTrend';
import {
  getAthleteForStaff,
  getCheckInHistory,
  getNutritionHistory,
  getStaffClubIds,
} from '@/lib/nutrition/data';
import { addDays, clockNow, dayKey, lastDays, monthDays, weekStart } from '@/lib/nutrition/dates';
import { monthNavigation } from '@/lib/nutrition/history-nav';
import { planSummary } from '@/lib/nutrition/plan';
import { hydrationSummary, nutritionFlags } from '@/lib/nutrition/tips';
import { weeklyTrend } from '@/lib/nutrition/trend';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** Periods the summary can cover; the calendar below goes back further, month by month. */
const PERIODS = [
  { value: '14', days: 14, label: '14 days', phrase: 'over the last 14 days' },
  { value: '30', days: 30, label: '30 days', phrase: 'over the last 30 days' },
  { value: '90', days: 91, label: '3 months', phrase: 'over the last 3 months' },
  { value: '180', days: 182, label: '6 months', phrase: 'over the last 6 months' },
] as const;
const DEFAULT_PERIOD = PERIODS[1];

export default async function CoachAthleteNutritionPage({
  params,
  searchParams,
}: {
  params: Promise<{ athleteId: string }>;
  searchParams: Promise<{ period?: string; month?: string }>;
}) {
  const [{ athleteId }, query] = await Promise.all([params, searchParams]);
  const clubIds = await getStaffClubIds();
  if (!clubIds) redirect('/dashboard/coach');

  // Only athletes of the coach's own clubs; anyone else looks like a missing page.
  const athlete = await getAthleteForStaff(athleteId, clubIds);
  if (!athlete) notFound();

  const basePath = `/dashboard/coach/nutrition/${athlete.id}`;
  const period = PERIODS.find((p) => p.value === query.period) ?? DEFAULT_PERIOD;
  const today = dayKey();
  const days = lastDays(today, period.days);
  const monday = weekStart(today);
  const weekCount = Math.min(26, Math.max(6, Math.ceil(period.days / 7)));
  const weeks = Array.from({ length: weekCount }, (_, i) =>
    addDays(monday, (i - weekCount + 1) * 7)
  );
  const nav = monthNavigation(basePath, query.month, today, { period: period.value });

  const [history, monthHistory, checkIns] = await Promise.all([
    getNutritionHistory(athlete, days),
    getNutritionHistory(athlete, monthDays(nav.month, today)),
    getCheckInHistory(athlete.id, weeks),
  ]);

  const plan = planSummary(
    days,
    (date) => history.find((d) => d.date === date)?.steps.length ?? 0,
    new Map(history.map((d) => [d.date, d.done.length]))
  );
  const water = hydrationSummary(days, history);
  const meals = history.reduce((sum, d) => sum + d.meals.length, 0);
  // Training days already over, and how many of them had a recovery (or refuel) step ticked.
  const pastTraining = history.filter((d) => d.date < today && d.sessions.length > 0);
  const recovered = pastTraining.filter((d) =>
    d.done.some((id) => id.startsWith('recovery:') || id.startsWith('refuel:'))
  ).length;

  // Flags always look at the current week, whatever the period.
  const logDays = history.filter((d) => d.meals.length > 0 || d.glasses > 0 || d.done.length > 0);
  const recentWater = lastDays(today, 7);
  const recentSummary = hydrationSummary(
    recentWater,
    history.filter((d) => recentWater.includes(d.date))
  );
  const flags = nutritionFlags({
    lastLog: logDays.at(-1)?.date ?? null,
    staleBefore: addDays(today, -2),
    hydrationPct: recentSummary.pct,
    hydrationDays: recentSummary.daysTracked,
    checkIn: checkIns.find((c) => c.week === monday) ?? null,
  });

  const name = `${athlete.first_name ?? ''} ${athlete.last_name ?? ''}`.trim() || 'Athlete';
  const first = athlete.first_name || 'This athlete';
  const initials =
    `${athlete.first_name?.charAt(0) ?? ''}${athlete.last_name?.charAt(0) ?? ''}`.toUpperCase();
  const periodHref = (value: string) =>
    `${basePath}?${new URLSearchParams({ period: value, month: nav.month }).toString()}`;

  return (
    <Reveal className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <Link
        href="/dashboard/coach/nutrition"
        data-reveal
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Team nutrition
      </Link>

      <WelcomeBanner
        eyebrow={athlete.clubName ? `Nutrition · ${athlete.clubName}` : 'Nutrition'}
        title={name}
        description={`Fuel plan, water, meals and check-ins ${period.phrase}.`}
        initials={initials || undefined}
        actions={
          <Link href={`/dashboard/coach/athletes/${athlete.id}`} className={bannerSecondaryAction}>
            <UserRound className="size-4" />
            Athlete profile
          </Link>
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {flags.length > 0 ? (
              flags.map((flag) => <FlagBadge key={flag} flag={flag} dark />)
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-sm font-medium text-lime-100">
                <span className="size-1.5 rounded-full bg-lime-300" />
                Nothing to flag this week
              </span>
            )}
          </div>
          <nav
            aria-label="Summary period"
            className="inline-flex self-start rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur"
          >
            {PERIODS.map((p) => (
              <Link
                key={p.value}
                href={periodHref(p.value)}
                scroll={false}
                aria-current={p.value === period.value ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors',
                  p.value === period.value
                    ? 'bg-white text-ink-950 shadow'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </WelcomeBanner>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          reveal
          title="Fuel plan followed"
          value={plan.pct}
          suffix="%"
          icon={ListChecks}
          tone="emerald"
          description={
            plan.daysTracked
              ? `Over ${plan.daysTracked} day${plan.daysTracked === 1 ? '' : 's'} of use`
              : 'Plan not used in this period'
          }
        />
        <StatCard
          reveal
          title="Water goal reached"
          value={water.pct}
          suffix="%"
          icon={Droplet}
          tone="sky"
          description={
            water.daysTracked ? `Average over ${water.daysTracked} days` : 'No water logged'
          }
        />
        <StatCard
          reveal
          title="Recovery after training"
          value={recovered}
          suffix={` / ${pastTraining.length}`}
          icon={BatteryCharging}
          tone="violet"
          description="Training days with a recovery meal ticked"
        />
        <StatCard
          reveal
          title={`Meals logged (${period.label})`}
          value={meals}
          icon={UtensilsCrossed}
          tone="amber"
        />
      </div>

      <WeeklyTrend weeks={weeklyTrend(history)} periodLabel={period.phrase} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div id="history" className="scroll-mt-24 lg:col-span-3">
          <NutritionHistory
            key={nav.month}
            days={monthHistory}
            month={nav.month}
            monthLabel={nav.monthLabel}
            prevHref={nav.prevHref}
            nextHref={nav.nextHref}
            months={nav.months}
            today={today}
            now={clockNow()}
            title="Day by day"
            description={`What ${first} planned, ticked, ate and drank. Pick a month, then a day.`}
            subject={first}
          />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <CheckInTrend weeks={weeks} entries={checkIns} />
          <p data-reveal className="text-xs text-muted-foreground">
            Flags are prompts for a conversation, not a diagnosis, and always look at the current
            week. Plan and water percentages start from the athlete’s first log in the period, so
            days before they started using the app don’t count against them.
          </p>
        </div>
      </div>
    </Reveal>
  );
}
