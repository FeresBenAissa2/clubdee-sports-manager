// One-off: print the live Supabase schema (tables, columns, defaults, FKs) and row counts.
import { writeFileSync } from 'node:fs';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: key, Authorization: `Bearer ${key}` };

const spec = await (await fetch(`${url}/rest/v1/`, { headers })).json();
const out = {};
for (const [table, def] of Object.entries(spec.definitions ?? {})) {
  const cols = {};
  for (const [col, p] of Object.entries(def.properties ?? {})) {
    const fk = /Foreign Key to `([\w]+)\.([\w]+)`/.exec(p.description ?? '');
    cols[col] = {
      type: p.format ?? p.type,
      ...(p.default !== undefined ? { default: p.default } : {}),
      ...(p.enum ? { enum: p.enum } : {}),
      ...(fk ? { fk: `${fk[1]}.${fk[2]}` } : {}),
      ...(p.description?.includes('<pk/>') ? { pk: true } : {}),
    };
  }
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
  });
  const count = res.headers.get('content-range')?.split('/')[1];
  out[table] = { count, required: def.required ?? [], cols };
}
const rpcs = Object.keys(spec.paths ?? {}).filter((p) => p.startsWith('/rpc/'));
writeFileSync(process.argv[2], JSON.stringify({ tables: out, rpcs }, null, 1));
