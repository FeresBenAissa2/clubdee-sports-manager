import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, ChevronRight, ClipboardList, Droplet, Users } from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Reveal } from '@/components/motion/Reveal';
import { FlagBadge } from '@/components/nutrition/FlagBadge';
import { CHECKIN_FIELDS } from '@/lib/nutrition/catalog';
import { getStaffClubIds, getTeamNutrition, type TeamRow } from '@/lib/nutrition/data';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const DAY = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const formatDay = (key: string) => DAY.format(new Date(`${key}T00:00:00Z`));

function CheckInCell({ row }: { row: TeamRow }) {
  if (!row.checkIn) return <span className="text-muted-foreground">Not submitted</span>;
  return (
    <div>
      <div className="flex gap-2">
        {CHECKIN_FIELDS.map((field) => {
          const score = row.checkIn![field.id];
          return (
            <span
              key={field.id}
              title={`${field.label}: ${score}/5`}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs tabular-nums ring-1 ring-inset',
                score <= 2
                  ? 'bg-rose-50 text-rose-700 ring-rose-100'
                  : 'bg-secondary/60 text-foreground ring-border/60'
              )}
            >
              <span aria-hidden>{field.faces[score - 1]}</span>
              <span className="sr-only">{field.label}</span>
              {score}
            </span>
          );
        })}
      </div>
      {row.checkIn.note && (
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">“{row.checkIn.note}”</p>
      )}
    </div>
  );
}

export default async function CoachNutritionPage() {
  const clubIds = await getStaffClubIds();
  if (!clubIds) redirect('/dashboard/coach');

  const { rows, weekStart } = await getTeamNutrition(clubIds);

  const flagged = rows.filter((r) => r.flags.length > 0);
  const logging = rows.filter((r) => !r.flags.includes('not_logging'));
  const avgHydration = logging.length
    ? Math.round(logging.reduce((sum, r) => sum + r.hydrationPct, 0) / logging.length)
    : 0;
  const checkIns = rows.filter((r) => r.checkIn).length;

  // Athletes who need attention first.
  const sorted = [...rows].sort(
    (a, b) =>
      Number(b.flags.includes('low_energy')) - Number(a.flags.includes('low_energy')) ||
      b.flags.length - a.flags.length ||
      a.name.localeCompare(b.name)
  );

  return (
    <Reveal className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Nutrition"
        title="Team nutrition"
        description={`Fuel plan, hydration, meals and weekly check-ins for your athletes. Week of ${formatDay(weekStart)}. Open an athlete to see their days in detail.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard reveal title="Athletes" value={rows.length} icon={Users} tone="brand" />
        <StatCard
          reveal
          title="Need attention"
          value={flagged.length}
          icon={AlertTriangle}
          tone="rose"
        />
        <StatCard
          reveal
          title="Avg hydration (7d)"
          value={avgHydration}
          suffix="%"
          icon={Droplet}
          tone="sky"
          description="Among athletes who are logging"
        />
        <StatCard
          reveal
          title="Check-ins this week"
          value={checkIns}
          suffix={` / ${rows.length}`}
          icon={ClipboardList}
          tone="violet"
        />
      </div>

      <section
        data-reveal
        className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft"
      >
        {rows.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No athletes in your club yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border/70 bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Athlete
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Fuel plan (7d)
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Hydration (7d)
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Meals (7d)
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Weekly check-in
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Last log
                  </th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sorted.map((row) => (
                  <tr
                    key={row.athleteId}
                    className="group align-top transition-colors hover:bg-blue-50/40"
                  >
                    <th scope="row" className="px-5 py-4 font-medium text-foreground">
                      <Link
                        href={`/dashboard/coach/nutrition/${row.athleteId}`}
                        className="hover:text-blue-700 hover:underline"
                      >
                        {row.name}
                      </Link>
                      {row.flags.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {row.flags.map((flag) => (
                            <FlagBadge key={flag} flag={flag} />
                          ))}
                        </span>
                      )}
                    </th>
                    <td className="px-5 py-4">
                      {row.planDays > 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  row.planPct >= 70
                                    ? 'bg-lime-500'
                                    : row.planPct >= 40
                                      ? 'bg-sky-500'
                                      : 'bg-amber-500'
                                )}
                                style={{ width: `${row.planPct}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-foreground">{row.planPct}%</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            steps ticked · {row.planDays} {row.planDays === 1 ? 'day' : 'days'}
                          </p>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Not used yet</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              row.hydrationPct >= 80
                                ? 'bg-emerald-500'
                                : row.hydrationPct >= 50
                                  ? 'bg-sky-500'
                                  : 'bg-amber-500'
                            )}
                            style={{ width: `${row.hydrationPct}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-foreground">{row.hydrationPct}%</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.todayGlasses} {row.todayGlasses === 1 ? 'glass' : 'glasses'} today
                        {row.hydrationDays > 0 &&
                          row.hydrationDays < 7 &&
                          ` · tracked ${row.hydrationDays} ${row.hydrationDays === 1 ? 'day' : 'days'}`}
                      </p>
                    </td>
                    <td className="px-5 py-4 tabular-nums text-foreground">{row.mealsThisWeek}</td>
                    <td className="px-5 py-4">
                      <CheckInCell row={row} />
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {row.lastLog ? formatDay(row.lastLog) : 'Never'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/coach/nutrition/${row.athleteId}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-blue-600 hover:bg-blue-50"
                        aria-label={`Nutrition details for ${row.name}`}
                      >
                        Details
                        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p data-reveal className="text-xs text-muted-foreground">
        Flags are prompts for a conversation, not a diagnosis. “Low energy” means a check-in score
        of 2 or less for energy (or a low average); “Low hydration” means under half of the water
        goal on average, once an athlete has at least 3 days of history; “Not logging” means nothing
        recorded in the last 3 days. Hydration is averaged from the athlete’s first log in the last
        7 days.
      </p>
    </Reveal>
  );
}
