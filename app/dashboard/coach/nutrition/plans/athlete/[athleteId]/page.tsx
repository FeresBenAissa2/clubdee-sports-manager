import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Reveal } from '@/components/motion/Reveal';
import { MealPlanEditor } from '@/components/nutrition/MealPlanEditor';
import {
  getAthleteEnergy,
  getAthleteForStaff,
  getAthletePlan,
  getClubPlan,
  getStaffClubIds,
} from '@/lib/nutrition/data';
import { dayKey } from '@/lib/nutrition/dates';
import { isAdult } from '@/lib/nutrition/portions';

export const dynamic = 'force-dynamic';

export default async function AthleteMealPlanPage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = await params;
  const clubIds = await getStaffClubIds();
  if (!clubIds) redirect('/dashboard/coach');
  // Only athletes of the coach's own clubs; anyone else looks like a missing page.
  const athlete = await getAthleteForStaff(athleteId, clubIds);
  if (!athlete) notFound();

  const [own, team, energy] = await Promise.all([
    getAthletePlan(athlete.id),
    getClubPlan(athlete.club_id),
    getAthleteEnergy(athlete),
  ]);
  const name = `${athlete.first_name ?? ''} ${athlete.last_name ?? ''}`.trim() || 'Athlete';
  const adult = isAdult(athlete.date_of_birth, dayKey());
  const start = own ?? team;
  // A fixed level or one calculated from body data is set on the athlete page, not here.
  const bodyHref = `/dashboard/coach/nutrition/${athlete.id}#body-energy-title`;
  const levelLock = energy.fixedLevel
    ? { level: energy.fixedLevel, reason: 'Fixed by a coach.', href: bodyHref }
    : energy.recommendation
      ? {
          level: energy.recommendation.level,
          reason: `Calculated from ${name.split(' ')[0]}’s body data and ${energy.recommendation.hoursPerWeek} h of training a week.`,
          href: bodyHref,
        }
      : null;

  return (
    <Reveal className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
      <Link
        href={`/dashboard/coach/nutrition/${athlete.id}`}
        data-reveal
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {name}
      </Link>
      <PageHeader
        eyebrow={`Meal plan · ${athlete.clubName}`}
        title={name}
        description={[
          own
            ? 'This athlete has their own plan.'
            : team
              ? 'Starts from the team plan; saving creates a plan just for this athlete.'
              : 'No team plan yet; saving creates a plan just for this athlete.',
          adult
            ? 'Aged 18+: they see calories and macros.'
            : 'Under 18 (or no birth date): they see portions only, never calories.',
        ].join(' ')}
      />
      <MealPlanEditor
        scope="athlete"
        targetId={athlete.id}
        initial={
          start
            ? { level_kcal: start.level_kcal, style: start.style, meals: start.meals ?? {} }
            : null
        }
        exists={own !== null}
        backHref={`/dashboard/coach/nutrition/${athlete.id}`}
        levelLock={levelLock}
      />
    </Reveal>
  );
}
