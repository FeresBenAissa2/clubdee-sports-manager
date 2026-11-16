import { redirect } from 'next/navigation';
import { AlertTriangle, ClipboardList, Droplet, Users } from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Reveal } from '@/components/motion/Reveal';
import { CHECKIN_FIELDS } from '@/lib/nutrition/catalog';
import { getStaffClubIds, getTeamNutrition, type TeamFlag, type TeamRow } from '@/lib/nutrition/data';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const FLAG: Record<TeamFlag, { label: string; className: string }> = {
  low_energy: { label: 'Low energy', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
  low_hydration: { label: 'Low hydration', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  not_logging: { label: 'Not logging', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

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
                score <= 2 ? 'bg-rose-50 text-rose-700 ring-rose-100' : 'bg-secondary/60 text-foreground ring-border/60'
              )}
            >
              <span aria-hidden>{field.faces[score - 1]}</span>
              <span className="sr-only">{field.label}</span>
              {score}
            </span>
          );
        })}
      </div>
      {row.checkIn.note && <p className="mt-1 max-w-xs text-xs text-muted-foreground">“{row.checkIn.note}”</p>}
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
        description={`Hydration, meal logging and weekly check-ins for your athletes. Week of ${formatDay(weekStart)}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard reveal title="Athletes" value={rows.length} icon={Users} tone="brand" />
        <StatCard reveal title="Need attention" value={flagged.length} icon={AlertTriangle} tone="rose" />
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

      <section data-reveal className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No athletes in your club yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border/70 bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Athlete</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Hydration (7d)</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Meals (7d)</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Weekly check-in</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Last log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sorted.map((row) => (
                  <tr key={row.athleteId} className="align-top">
                    <th scope="row" className="px-5 py-4 font-medium text-foreground">
                      {row.name}
                      {row.flags.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {row.flags.map((flag) => (
                            <span
                              key={flag}
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                                FLAG[flag].className
                              )}
                            >
                              {FLAG[flag].label}
                            </span>
                          ))}
                        </span>
                      )}
                    </th>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              row.hydrationPct >= 80 ? 'bg-emerald-500' : row.hydrationPct >= 50 ? 'bg-sky-500' : 'bg-amber-500'
                            )}
                            style={{ width: `${row.hydrationPct}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-foreground">{row.hydrationPct}%</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.todayGlasses} {row.todayGlasses === 1 ? 'glass' : 'glasses'} today
                        {row.hydrationDays > 0 && row.hydrationDays < 7 &&
                          ` · tracked ${row.hydrationDays} ${row.hydrationDays === 1 ? 'day' : 'days'}`}
                      </p>
                    </td>
                    <td className="px-5 py-4 tabular-nums text-foreground">{row.mealsThisWeek}</td>
                    <td className="px-5 py-4">
                      <CheckInCell row={row} />
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{row.lastLog ? formatDay(row.lastLog) : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p data-reveal className="text-xs text-muted-foreground">
        Flags are prompts for a conversation, not a diagnosis. “Low energy” means a check-in score of 2 or less for
        energy (or a low average); “Low hydration” means under half of the water goal on average, once an athlete
        has at least 3 days of history; “Not logging” means nothing recorded in the last 3 days. Hydration is
        averaged from the athlete’s first log in the last 7 days.
      </p>
    </Reveal>
  );
}
