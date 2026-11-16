import { redirect } from 'next/navigation';
import { History } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { FuelToday } from '@/components/nutrition/FuelToday';
import { HydrationCard } from '@/components/nutrition/HydrationCard';
import { LogMealDialog } from '@/components/nutrition/LogMealDialog';
import { NutritionHistory } from '@/components/nutrition/NutritionHistory';
import { TomorrowCard } from '@/components/nutrition/TomorrowCard';
import { WeeklyCheckIn } from '@/components/nutrition/WeeklyCheckIn';
import { getAthleteNutrition, getCurrentAthlete, getNutritionHistory } from '@/lib/nutrition/data';
import { addDays, APP_TIME_ZONE, clockNow, monthDays } from '@/lib/nutrition/dates';
import { HISTORY_MONTHS, monthNavigation } from '@/lib/nutrition/history-nav';
import { buildFuelPlan } from '@/lib/nutrition/plan';

export const dynamic = 'force-dynamic';

const DATE_LABEL = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

export default async function AthleteNutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const athlete = await getCurrentAthlete();
  if (!athlete) redirect('/dashboard/athlete');

  const [data, query] = await Promise.all([getAthleteNutrition(athlete), searchParams]);
  const steps = buildFuelPlan(data.sessionsToday);
  const nav = monthNavigation('/dashboard/athlete/nutrition', query.month, data.today);
  const history = await getNutritionHistory(athlete, monthDays(nav.month, data.today));
  // Today is the plan above, so the calendar opens on yesterday when it can.
  const yesterday = addDays(data.today, -1);
  const now = clockNow();

  return (
    <Reveal className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <FuelToday
        steps={steps}
        sessions={data.sessionsToday}
        done={data.planChecks}
        initialNow={now}
        timeZone={APP_TIME_ZONE}
        dateLabel={DATE_LABEL.format(new Date(`${data.today}T00:00:00Z`))}
        planAction={
          <div className="flex flex-wrap gap-2">
            <a
              href="#history"
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              <History className="size-3.5" />
              Past days
            </a>
            <LogMealDialog
              meals={data.meals.map((m) => ({
                id: m.id,
                meal_type: m.meal_type,
                items: m.items,
                note: m.note,
              }))}
            />
          </div>
        }
        below={<TomorrowCard sessions={data.sessionsTomorrow} />}
        aside={
          <>
            <HydrationCard
              glasses={data.hydration.glasses}
              goal={data.hydration.goal}
              trainingDay={data.sessionsToday.length > 0}
              week={data.week}
            />
            <WeeklyCheckIn key={data.weekStart} initial={data.checkIn} />
          </>
        }
      />

      <div id="history" className="scroll-mt-24">
        <NutritionHistory
          key={nav.month}
          wide
          days={history}
          month={nav.month}
          monthLabel={nav.monthLabel}
          prevHref={nav.prevHref}
          nextHref={nav.nextHref}
          months={nav.months}
          initialDate={yesterday}
          today={data.today}
          now={now}
          title="Past days"
          description={`Plan steps, water and meals, up to ${HISTORY_MONTHS} months back. Tap a day to see it.`}
        />
      </div>

      <p data-reveal className="text-xs text-muted-foreground">
        These tips are general guidance for active young people, not medical advice. If you often
        feel very tired, dizzy or have no appetite, talk to your coach, your parents or a doctor.
      </p>
    </Reveal>
  );
}
