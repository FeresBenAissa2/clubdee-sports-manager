import { redirect } from 'next/navigation';
import { Reveal } from '@/components/motion/Reveal';
import { FuelToday } from '@/components/nutrition/FuelToday';
import { HydrationCard } from '@/components/nutrition/HydrationCard';
import { LogMealDialog } from '@/components/nutrition/LogMealDialog';
import { TomorrowCard } from '@/components/nutrition/TomorrowCard';
import { WeeklyCheckIn } from '@/components/nutrition/WeeklyCheckIn';
import { getAthleteNutrition, getCurrentAthlete } from '@/lib/nutrition/data';
import { APP_TIME_ZONE, clockNow } from '@/lib/nutrition/dates';
import { buildFuelPlan } from '@/lib/nutrition/plan';

export const dynamic = 'force-dynamic';

const DATE_LABEL = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

export default async function AthleteNutritionPage() {
  const athlete = await getCurrentAthlete();
  if (!athlete) redirect('/dashboard/athlete');

  const data = await getAthleteNutrition(athlete);
  const steps = buildFuelPlan(data.sessionsToday);

  return (
    <Reveal className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <FuelToday
        steps={steps}
        sessions={data.sessionsToday}
        done={data.planChecks}
        initialNow={clockNow()}
        timeZone={APP_TIME_ZONE}
        dateLabel={DATE_LABEL.format(new Date(`${data.today}T00:00:00Z`))}
        planAction={
          <LogMealDialog
            meals={data.meals.map((m) => ({
              id: m.id,
              meal_type: m.meal_type,
              items: m.items,
              note: m.note,
            }))}
          />
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

      <p data-reveal className="text-xs text-muted-foreground">
        These tips are general guidance for active young people, not medical advice. If you often
        feel very tired, dizzy or have no appetite, talk to your coach, your parents or a doctor.
      </p>
    </Reveal>
  );
}
