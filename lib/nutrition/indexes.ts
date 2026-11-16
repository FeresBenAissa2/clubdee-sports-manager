import type { Db } from 'mongodb';

export const NUTRITION_COLLECTIONS = {
  hydration: 'nutrition_hydration',
  meals: 'nutrition_meals',
  checkins: 'nutrition_checkins',
  planChecks: 'nutrition_plan_checks',
  mealPlans: 'nutrition_meal_plans',
  bodyMetrics: 'nutrition_body_metrics',
  profiles: 'nutrition_profiles',
} as const;

/** Called once per process from lib/db/indexes.ts. */
export async function ensureNutritionIndexes(db: Db): Promise<void> {
  const { hydration, meals, checkins, planChecks, mealPlans, bodyMetrics, profiles } =
    NUTRITION_COLLECTIONS;
  await Promise.all([
    db
      .collection(hydration)
      .createIndex({ athlete_id: 1, date: 1 }, { unique: true, name: 'uniq_athlete_date' }),
    db.collection(hydration).createIndex({ club_id: 1, date: 1 }, { name: 'club_date' }),
    db.collection(meals).createIndex({ athlete_id: 1, date: 1 }, { name: 'athlete_date' }),
    db.collection(meals).createIndex({ club_id: 1, date: 1 }, { name: 'club_date' }),
    db
      .collection(checkins)
      .createIndex({ athlete_id: 1, week: 1 }, { unique: true, name: 'uniq_athlete_week' }),
    db.collection(checkins).createIndex({ club_id: 1, week: 1 }, { name: 'club_week' }),
    db
      .collection(planChecks)
      .createIndex(
        { athlete_id: 1, date: 1, step_id: 1 },
        { unique: true, name: 'uniq_athlete_date_step' }
      ),
    // One team plan per club (athlete_id null) and one plan per athlete.
    db
      .collection(mealPlans)
      .createIndex(
        { scope: 1, club_id: 1, athlete_id: 1 },
        { unique: true, name: 'uniq_scope_club_athlete' }
      ),
    // One measurement per athlete and day; the latest one is used.
    db
      .collection(bodyMetrics)
      .createIndex({ athlete_id: 1, date: 1 }, { unique: true, name: 'uniq_athlete_date' }),
    db.collection(profiles).createIndex({ athlete_id: 1 }, { unique: true, name: 'uniq_athlete' }),
  ]);
}
