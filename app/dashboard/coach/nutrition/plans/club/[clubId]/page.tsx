import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Reveal } from '@/components/motion/Reveal';
import { MealPlanEditor } from '@/components/nutrition/MealPlanEditor';
import { getClubPlanSummaries, getStaffClubIds } from '@/lib/nutrition/data';

export const dynamic = 'force-dynamic';

export default async function ClubMealPlanPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const clubIds = await getStaffClubIds();
  if (!clubIds) redirect('/dashboard/coach');
  // Only the coach's own clubs; anything else looks like a missing page.
  if (!clubIds.includes(clubId)) notFound();

  const [club] = await getClubPlanSummaries([clubId]);
  if (!club) notFound();

  return (
    <Reveal className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
      <Link
        href="/dashboard/coach/nutrition/plans"
        data-reveal
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Meal plans
      </Link>
      <PageHeader
        eyebrow="Team meal plan"
        title={club.clubName}
        description={`Applies to the ${club.athletes} athlete${club.athletes === 1 ? '' : 's'} of this team${
          club.custom.length ? `, except ${club.custom.length} with their own plan` : ''
        }.`}
      />
      <MealPlanEditor
        scope="club"
        targetId={club.clubId}
        initial={
          club.plan
            ? {
                level_kcal: club.plan.level_kcal,
                style: club.plan.style,
                meals: club.plan.meals ?? {},
              }
            : null
        }
        exists={club.plan !== null}
        backHref="/dashboard/coach/nutrition/plans"
      />
    </Reveal>
  );
}
