import type { Db } from 'mongodb';
import { SCHEMA } from './schema.generated';
import { ensureNutritionIndexes } from '@/lib/nutrition/indexes';

/** Unique keys from the old Postgres schema, plus lookups the app filters on constantly. */
export async function ensureIndexes(db: Db): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  for (const [table, def] of Object.entries(SCHEMA)) {
    const collection = db.collection(table);
    const keys = new Set<string>();
    if (def.pk.length > 1 || (def.pk.length === 1 && def.pk[0] !== 'id')) {
      keys.add(def.pk.join(','));
      jobs.push(
        collection.createIndex(Object.fromEntries(def.pk.map((c) => [c, 1])), {
          unique: true,
          name: `pk_${def.pk.join('_')}`,
        })
      );
    }
    for (const unique of def.uniques) {
      if (keys.has(unique.join(','))) continue;
      keys.add(unique.join(','));
      jobs.push(
        collection.createIndex(Object.fromEntries(unique.map((c) => [c, 1])), {
          unique: true,
          name: `uniq_${unique.join('_')}`,
          // Postgres allows many NULLs in a unique column; only index rows that have every key.
          partialFilterExpression: Object.fromEntries(unique.map((c) => [c, { $exists: true, $type: ['string', 'number', 'bool', 'date', 'objectId'] }])),
        })
      );
    }
    for (const fk of def.fks) {
      const col = fk.columns[0];
      if (!keys.has(col)) jobs.push(collection.createIndex({ [col]: 1 }, { name: `fk_${col}` }));
    }
  }
  jobs.push(db.collection('users').createIndex({ email: 1 }, { unique: true, name: 'uniq_email' }));
  jobs.push(ensureNutritionIndexes(db));
  // One attendance row per athlete and session, whoever records it (coach or self check-in).
  jobs.push(
    db.collection('attendance').createIndex(
      { training_session_id: 1, athlete_id: 1 },
      {
        unique: true,
        name: 'uniq_session_athlete',
        partialFilterExpression: { training_session_id: { $type: 'string' }, athlete_id: { $type: 'string' } },
      }
    )
  );
  jobs.push(backfillAnnouncementAuthors(db));
  await Promise.all(jobs);
}

/**
 * Announcements can only be changed by their author (`created_by`). Older rows were
 * saved without it, so fill it in from the coach row that posted them.
 */
async function backfillAnnouncementAuthors(db: Db): Promise<void> {
  const orphans = await db
    .collection('announcements')
    .find({ created_by: { $in: [null, undefined] }, coach_id: { $type: 'string' } }, { projection: { _id: 1, coach_id: 1 } })
    .toArray();
  if (orphans.length === 0) return;

  const coaches = await db
    .collection('coaches')
    .find({ id: { $in: orphans.map((a) => a.coach_id) } }, { projection: { id: 1, user_id: 1 } })
    .toArray();
  const userOfCoach = new Map(coaches.map((c) => [c.id as string, c.user_id as string]));

  await Promise.all(
    orphans
      .filter((a) => userOfCoach.has(a.coach_id))
      .map((a) => db.collection('announcements').updateOne({ _id: a._id }, { $set: { created_by: userOfCoach.get(a.coach_id) } }))
  );
}
