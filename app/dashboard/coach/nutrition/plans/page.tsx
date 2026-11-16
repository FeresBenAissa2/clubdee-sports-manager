import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ChevronRight, ClipboardList, Pencil, Plus, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Reveal } from '@/components/motion/Reveal';
import { getClubPlanSummaries, getStaffClubIds } from '@/lib/nutrition/data';
import { PLAN_STYLES } from '@/lib/nutrition/portions';

export const dynamic = 'force-dynamic';

const DATE = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function MealPlansPage() {
  const clubIds = await getStaffClubIds();
  if (!clubIds) redirect('/dashboard/coach');
  const clubs = await getClubPlanSummaries(clubIds);

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

      <PageHeader
        eyebrow="Nutrition"
        title="Meal plans"
        description="Set a daily energy level per team; every athlete gets meals with exact portions, built around their training. Customize an athlete when they need something different."
      />

      {clubs.length === 0 ? (
        <p
          data-reveal
          className="rounded-2xl border border-border/80 bg-card p-8 text-center text-muted-foreground"
        >
          You are not linked to a club yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clubs.map((club) => {
            const style = PLAN_STYLES.find((s) => s.id === club.plan?.style);
            return (
              <section
                key={club.clubId}
                data-reveal
                className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.14em] text-blue-600 uppercase">
                      {club.athletes} athlete{club.athletes === 1 ? '' : 's'}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">{club.clubName}</h2>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
                    <ClipboardList className="size-5" />
                  </span>
                </div>

                {club.plan ? (
                  <div className="mt-4 rounded-xl bg-secondary/50 p-4">
                    <p className="font-display text-2xl font-semibold text-foreground tabular-nums">
                      {club.plan.level_kcal.toLocaleString('en-US')}
                      <span className="text-sm text-muted-foreground"> kcal / day</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {style?.label ?? 'Balanced'} · {Object.keys(club.plan.meals ?? {}).length}{' '}
                      custom meal
                      {Object.keys(club.plan.meals ?? {}).length === 1 ? '' : 's'} · updated{' '}
                      {DATE.format(new Date(club.plan.updated_at))}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No team plan yet: athletes only see food ideas, without portions.
                  </p>
                )}

                {club.custom.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Athletes with their own plan
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {club.custom.map((a) => (
                        <li key={a.id}>
                          <Link
                            href={`/dashboard/coach/nutrition/plans/athlete/${a.id}`}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-100 hover:bg-blue-100"
                          >
                            <UserRound className="size-3" />
                            {a.name || 'Athlete'}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-auto pt-5">
                  <Link
                    href={`/dashboard/coach/nutrition/plans/club/${club.clubId}`}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
                  >
                    {club.plan ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                    {club.plan ? 'Edit team plan' : 'Create team plan'}
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p data-reveal className="text-xs text-muted-foreground">
        The team level is a default: athletes with a height and weight get their own level,
        calculated from their body and training, with the team&apos;s meals. Values are approximate,
        from typical home recipes. Athletes under 18 see their portions in grams and household
        measures, never calorie numbers. To customize one athlete, open them from Team nutrition.
      </p>
    </Reveal>
  );
}
