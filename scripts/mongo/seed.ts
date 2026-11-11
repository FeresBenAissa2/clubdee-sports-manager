/**
 * Loads scripts/mongo/snapshot (the data copied from Supabase) into MongoDB.
 *
 *   npm run db:seed              wipe the database, then load the snapshot
 *   npm run db:seed -- --keep    load on top of what is already there (skips existing rows)
 *
 * Supabase never exports password hashes, so every copied account gets SEED_PASSWORD
 * (default "Demo123456!", the password shown on the login page).
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import type { Db } from 'mongodb';
import type { UserDoc } from '../../lib/db/auth/users';
import { ensureIndexes } from '../../lib/db/indexes';
import { getMongoClient, mongoConfig } from '../../lib/db/mongo';
import { prepareInsert } from '../../lib/db/query/executor';
import { SCHEMA } from '../../lib/db/schema.generated';
import { storageUrl, writeFile } from '../../lib/db/storage';

config({ path: '.env.local', quiet: true });

type Row = Record<string, unknown>;

interface Snapshot {
  supabase_url: string;
  tables: Record<string, Row[]>;
  users: (Row & { id: string; email: string })[];
  storage: { bucket: string; path: string; contentType: string }[];
}

const SNAPSHOT = join('scripts', 'mongo', 'snapshot');
const PASSWORD = process.env.SEED_PASSWORD || 'Demo123456!';
const DEMO_CLUB = '00000000-0000-0000-0000-000000000003';

/** Points copied Supabase Storage URLs at /api/storage. */
function rewriteUrls(value: unknown, base: string): unknown {
  if (typeof value === 'string') {
    const prefix = `${base}/storage/v1/object/public/`;
    if (!value.startsWith(prefix)) return value;
    const [bucket, ...path] = value.slice(prefix.length).split('/');
    return storageUrl(bucket, decodeURIComponent(path.join('/')));
  }
  if (Array.isArray(value)) return value.map((v) => rewriteUrls(v, base));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewriteUrls(v, base)]));
  }
  return value;
}

async function insertRows(db: Db, table: string, rows: Row[], keep: boolean) {
  if (!rows.length) return 0;
  const docs = rows.map((row) => prepareInsert(table, row));
  if (!keep) {
    await db.collection(table).insertMany(docs);
    return docs.length;
  }
  let inserted = 0;
  for (const doc of docs) {
    const res = await db.collection(table).updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
    inserted += res.upsertedCount;
  }
  return inserted;
}

function userDoc(user: Snapshot['users'][number], hash: string): UserDoc {
  const date = (v: unknown) => (v ? new Date(v as string) : null);
  return {
    _id: user.id,
    id: user.id,
    email: user.email.toLowerCase(),
    password_hash: hash,
    email_confirmed_at: date(user.email_confirmed_at) ?? new Date(),
    user_metadata: (user.user_metadata as Row) ?? {},
    app_metadata: (user.app_metadata as Row) ?? {},
    created_at: date(user.created_at) ?? new Date(),
    updated_at: date(user.updated_at) ?? new Date(),
    last_sign_in_at: date(user.last_sign_in_at),
  };
}

/** The login page offers demo.athlete@clubdee.com, which never existed in Supabase. */
function demoAthlete(snapshot: Snapshot): Snapshot {
  const email = 'demo.athlete@clubdee.com';
  if (snapshot.users.some((u) => u.email === email)) return snapshot;
  const id = randomUUID();
  const now = new Date().toISOString();
  const coach = snapshot.tables.coaches?.find((c) => c.club_id === DEMO_CLUB);
  const add = (table: string, row: Row) => (snapshot.tables[table] ??= []).push(row);

  snapshot.users.push({ id, email, user_metadata: { full_name: 'Demo Athlete' }, created_at: now });
  add('profiles', { id, email, full_name: 'Demo Athlete', club_id: DEMO_CLUB, membership_status: 'active', created_at: now });
  add('user_roles', { user_id: id, role: 'athlete', created_at: now });
  add('athletes', {
    id: randomUUID(),
    user_id: id,
    club_id: DEMO_CLUB,
    first_name: 'Demo',
    last_name: 'Athlete',
    nickname: 'Demo',
    date_of_birth: '2004-05-12',
    phone_number: '+21620000000',
    email,
    gender: 'female',
    created_at: now,
  });
  add('membership_applications', {
    id: randomUUID(),
    user_id: id,
    club_id: DEMO_CLUB,
    status: 'approved',
    personal_info: { full_name: 'Demo Athlete', email, phone_number: '+21620000000', date_of_birth: '2004-05-12' },
    documents: [],
    review_info: { reviewed_by: coach?.user_id ?? null, reviewed_at: now, reviewer_role: 'coach', notes: null },
    activity_log: [{ timestamp: now, action: 'submitted', by_user: id, by_role: 'athlete', club_id: DEMO_CLUB }],
    created_at: now,
  });
  return snapshot;
}

async function main() {
  const keep = process.argv.includes('--keep');
  const snapshot = demoAthlete(JSON.parse(readFileSync(join(SNAPSHOT, 'data.json'), 'utf8')) as Snapshot);
  const { dbName, uri } = mongoConfig();
  const client = await getMongoClient();
  const db = client.db(dbName);

  console.log(`${keep ? 'Loading into' : 'Resetting'} ${uri}/${dbName}`);
  if (!keep) await db.dropDatabase();

  const hash = await bcrypt.hash(PASSWORD, 10);
  let users = 0;
  for (const user of snapshot.users) {
    const doc = userDoc(user, hash);
    const res = await db.collection<UserDoc>('users').updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
    users += res.upsertedCount;
  }
  console.log(`users: ${users}`);

  for (const [table, rows] of Object.entries(snapshot.tables)) {
    if (!SCHEMA[table]) continue;
    const count = await insertRows(db, table, rewriteUrls(rows, snapshot.supabase_url) as Row[], keep);
    if (rows.length) console.log(`${table}: ${count}`);
  }

  for (const file of snapshot.storage) {
    const data = readFileSync(join(SNAPSHOT, 'storage', file.bucket, ...file.path.split('/')));
    await writeFile(db, file.bucket, file.path, data, { contentType: file.contentType, upsert: true });
  }
  if (snapshot.storage.length) console.log(`storage files: ${snapshot.storage.length}`);

  await ensureIndexes(db);
  console.log(`Done. Every account signs in with the password "${PASSWORD}".`);
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
