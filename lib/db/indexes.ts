import type { Db } from 'mongodb';
import { SCHEMA } from './schema.generated';

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
  await Promise.all(jobs);
}
