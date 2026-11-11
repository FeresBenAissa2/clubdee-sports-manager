/**
 * One-off: copy the live Supabase data (tables, auth users, storage files) into
 * scripts/mongo/snapshot so `npm run db:seed` can load it into MongoDB.
 *
 *   npx tsx scripts/mongo/export-supabase.ts
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';
import { SCHEMA } from '../../lib/db/schema.generated';

config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const SNAPSHOT = join('scripts', 'mongo', 'snapshot');
const PAGE = 1000;

async function getJson(path: string, init: RequestInit = {}) {
  const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function exportTables() {
  const spec = await getJson('/rest/v1/');
  const tables: Record<string, unknown[]> = {};
  for (const table of Object.keys(spec.definitions ?? {})) {
    if (!SCHEMA[table]) {
      console.warn(`skip ${table}: not in lib/db/schema.generated.ts`);
      continue;
    }
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      const page = await getJson(`/rest/v1/${table}?select=*`, { headers: { Range: `${from}-${from + PAGE - 1}` } });
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    tables[table] = rows;
    console.log(`${table}: ${rows.length}`);
  }
  return tables;
}

async function exportUsers() {
  const users: unknown[] = [];
  for (let page = 1; ; page++) {
    const { users: batch } = await getJson(`/auth/v1/admin/users?page=${page}&per_page=${PAGE}`);
    users.push(
      ...batch.map((u: Record<string, unknown>) => ({
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at ?? null,
        user_metadata: u.user_metadata ?? {},
        app_metadata: u.app_metadata ?? {},
        created_at: u.created_at,
        updated_at: u.updated_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }))
    );
    if (batch.length < PAGE) break;
  }
  console.log(`auth users: ${users.length}`);
  return users;
}

async function listObjects(bucket: string, prefix = ''): Promise<string[]> {
  const entries: { name: string; id: string | null }[] = await getJson(`/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: PAGE, offset: 0 }),
  });
  const paths: string[] = [];
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id) paths.push(path);
    else paths.push(...(await listObjects(bucket, path)));
  }
  return paths;
}

async function exportStorage() {
  const buckets: { id: string }[] = await getJson('/storage/v1/bucket');
  const files: { bucket: string; path: string; contentType: string }[] = [];
  for (const { id: bucket } of buckets) {
    for (const path of await listObjects(bucket)) {
      const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, { headers });
      if (!res.ok) {
        console.warn(`skip ${bucket}/${path}: ${res.status}`);
        continue;
      }
      const target = join(SNAPSHOT, 'storage', bucket, ...path.split('/'));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, Buffer.from(await res.arrayBuffer()));
      files.push({ bucket, path, contentType: res.headers.get('content-type') ?? 'application/octet-stream' });
    }
  }
  console.log(`storage files: ${files.length}`);
  return files;
}

async function main() {
  const snapshot = {
    exported_at: new Date().toISOString(),
    supabase_url: url,
    tables: await exportTables(),
    users: await exportUsers(),
    storage: await exportStorage(),
  };
  mkdirSync(SNAPSHOT, { recursive: true });
  writeFileSync(join(SNAPSHOT, 'data.json'), JSON.stringify(snapshot, null, 1));
  console.log(`wrote ${join(SNAPSHOT, 'data.json')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
