import type { Db } from 'mongodb';

export const NUTRITION_COLLECTIONS = {
  hydration: 'nutrition_hydration',
  meals: 'nutrition_meals',
  checkins: 'nutrition_checkins',
  planChecks: 'nutrition_plan_checks',
} as const;

/** Called once per process from lib/db/indexes.ts. */
export async function ensureNutritionIndexes(db: Db): Promise<void> {
  const { hydration, meals, checkins, planChecks } = NUTRITION_COLLECTIONS;
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
  ]);
}
