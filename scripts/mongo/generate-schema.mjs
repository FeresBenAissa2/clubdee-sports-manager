// Builds lib/db/schema.generated.ts from the historical SQL scripts plus the live
// Supabase schema snapshot. The MongoDB layer uses it for defaults, unique indexes,
// relation embedding and cascading deletes.
//
//   node scripts/mongo/generate-schema.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const LIVE = JSON.parse(
  readFileSync(join(ROOT, 'scripts/mongo/snapshot/supabase-live-schema.json'), 'utf8')
);

const tables = {};

function table(name) {
  return (tables[name] ??= { pk: [], columns: {}, uniques: [], fks: [] });
}

function normType(raw) {
  const t = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (t.endsWith('[]')) return 'array';
  if (t.startsWith('uuid')) return 'uuid';
  if (/^(timestamp|timestamptz)/.test(t)) return 'timestamptz';
  if (t === 'date') return 'date';
  if (/^time( |$|tz|\()/.test(t)) return 'time';
  if (/^(json|jsonb)/.test(t)) return 'json';
  if (/^(bool|boolean)/.test(t)) return 'bool';
  if (/^(smallint|integer|int|int2|int4|int8|bigint|serial|bigserial|smallserial)\b/.test(t)) return 'int';
  if (/^(numeric|decimal|real|double|float)/.test(t)) return 'numeric';
  return 'text';
}

function normDefault(raw, type) {
  let d = raw.trim();
  if (/^\(.*\)$/.test(d)) d = d.slice(1, -1).trim();
  const lower = d.toLowerCase();
  if (/gen_random_uuid|uuid_generate_v4/.test(lower)) return { kind: 'uuid' };
  if (/^(now\(\)|current_timestamp|timezone\('utc'::text, now\(\)\))/.test(lower)) {
    return type === 'date' ? { kind: 'today' } : { kind: 'now' };
  }
  if (lower === 'current_date') return { kind: 'today' };
  if (lower === 'true' || lower === 'false') return { kind: 'value', value: lower === 'true' };
  if (lower === 'null') return { kind: 'value', value: null };
  if (/^-?\d+(\.\d+)?$/.test(d)) return { kind: 'value', value: Number(d) };
  if (/^array\[\]/.test(lower) || lower === "'{}'::text[]" || lower === "'{}'::uuid[]") {
    return { kind: 'value', value: [] };
  }
  const lit = /^'((?:[^']|'')*)'(::[\w. \[\]"]+)?$/.exec(d);
  if (lit) {
    const text = lit[1].replace(/''/g, "'");
    if (type === 'json' || /::jsonb?$/i.test(lit[2] ?? '')) {
      try {
        return { kind: 'value', value: JSON.parse(text) };
      } catch {
        return undefined;
      }
    }
    if (type === 'array' && text === '{}') return { kind: 'value', value: [] };
    if (type === 'int' || type === 'numeric') return { kind: 'value', value: Number(text) };
    return { kind: 'value', value: text };
  }
  return undefined;
}

function refTable(raw) {
  const name = raw.replace(/"/g, '').toLowerCase();
  if (name === 'auth.users') return 'users';
  return name.replace(/^public\./, '');
}

function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let quote = false;
  let cur = '';
  for (const ch of body) {
    if (ch === "'") quote = !quote;
    if (!quote) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(cur.trim());
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

const cols = (s) => s.split(',').map((c) => c.trim().replace(/"/g, '').toLowerCase());

const ON_DELETE = /ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION|SET\s+DEFAULT)/i;

function addFk(t, name, columns, ref, refColumns, rest) {
  const onDelete = (ON_DELETE.exec(rest)?.[1] ?? 'no action').toLowerCase().replace(/\s+/g, ' ');
  t.fks = t.fks.filter((f) => f.columns.join() !== columns.join());
  t.fks.push({ name, columns, refTable: refTable(ref), refColumns, onDelete });
}

function addUnique(t, columns) {
  if (!t.uniques.some((u) => u.join() === columns.join())) t.uniques.push(columns);
}

const COL_KEYWORDS = /\s(NOT\s+NULL|NULL|DEFAULT|PRIMARY\s+KEY|UNIQUE|REFERENCES|CHECK|CONSTRAINT|GENERATED|COLLATE)\b/i;

function parseColumn(tname, def) {
  const m = /^"?(\w+)"?\s+([\s\S]*)$/.exec(def);
  if (!m) return;
  const name = m[1].toLowerCase();
  const rest = ' ' + m[2];
  const kw = COL_KEYWORDS.exec(rest);
  const rawType = (kw ? rest.slice(0, kw.index) : rest).trim();
  const type = normType(rawType);
  const t = table(tname);
  const col = (t.columns[name] ??= { type });
  col.type = type;

  const defM = /\sDEFAULT\s+((?:'(?:[^']|'')*'(?:::[\w. \[\]"]+)?|\([^)]*\)|[\w.]+(?:\([^)]*\))?(?:::[\w. \[\]"]+)?))/i.exec(rest);
  if (defM) {
    const d = normDefault(defM[1], type);
    if (d) col.default = d;
  }
  if (/\sPRIMARY\s+KEY\b/i.test(rest)) t.pk = [name];
  if (/\sUNIQUE\b/i.test(rest)) addUnique(t, [name]);
  const ref = /\sREFERENCES\s+([\w."]+)\s*(?:\(\s*"?(\w+)"?\s*\))?([\s\S]*)$/i.exec(rest);
  if (ref) addFk(t, `${tname}_${name}_fkey`, [name], ref[1], [ref[2]?.toLowerCase() ?? 'id'], ref[3]);
}

function parseConstraint(tname, def) {
  const t = table(tname);
  const named = /^CONSTRAINT\s+"?(\w+)"?\s+([\s\S]*)$/i.exec(def);
  const cname = named?.[1]?.toLowerCase();
  const body = named ? named[2] : def;
  let m;
  if ((m = /^PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(body))) {
    t.pk = cols(m[1]);
    return true;
  }
  if ((m = /^UNIQUE\s*(?:NULLS\s+NOT\s+DISTINCT\s*)?\(([^)]+)\)/i.exec(body))) {
    addUnique(t, cols(m[1]));
    return true;
  }
  if ((m = /^FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([\w."]+)\s*(?:\(([^)]+)\))?([\s\S]*)$/i.exec(body))) {
    const c = cols(m[1]);
    addFk(t, cname ?? `${tname}_${c[0]}_fkey`, c, m[2], m[3] ? cols(m[3]) : ['id'], m[4]);
    return true;
  }
  return /^(CHECK|EXCLUDE)\b/i.test(body);
}

function parseStatement(stmt) {
  let m;
  if ((m = /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?(\w+)"?\s*\(([\s\S]*)\)[^)]*$/i.exec(stmt))) {
    const tname = m[1].toLowerCase();
    table(tname);
    for (const part of splitTopLevel(m[2])) {
      if (!parseConstraint(tname, part)) parseColumn(tname, part);
    }
    return;
  }
  if ((m = /^ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?"?(\w+)"?\s+([\s\S]*)$/i.exec(stmt))) {
    const tname = m[1].toLowerCase();
    if (!tables[tname]) return;
    for (const action of splitTopLevel(m[2])) {
      let a;
      if ((a = /^ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([\s\S]*)$/i.exec(action))) {
        parseColumn(tname, a[1]);
      } else if ((a = /^ADD\s+([\s\S]*)$/i.exec(action))) {
        parseConstraint(tname, a[1]);
      } else if ((a = /^DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?/i.exec(action))) {
        const c = a[1].toLowerCase();
        delete tables[tname].columns[c];
        tables[tname].fks = tables[tname].fks.filter((f) => !f.columns.includes(c));
        tables[tname].uniques = tables[tname].uniques.filter((u) => !u.includes(c));
      } else if ((a = /^DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?/i.exec(action))) {
        const c = a[1].toLowerCase();
        tables[tname].fks = tables[tname].fks.filter((f) => f.name !== c);
        const uniq = /^(\w+?)_(.+)_key$/.exec(c);
        if (uniq) {
          tables[tname].uniques = tables[tname].uniques.filter((u) => `${tname}_${u.join('_')}_key` !== c);
        }
      } else if ((a = /^ALTER\s+COLUMN\s+"?(\w+)"?\s+SET\s+DEFAULT\s+([\s\S]*)$/i.exec(action))) {
        const col = tables[tname].columns[a[1].toLowerCase()];
        if (col) {
          const d = normDefault(a[2], col.type);
          if (d) col.default = d;
        }
      } else if ((a = /^ALTER\s+COLUMN\s+"?(\w+)"?\s+DROP\s+DEFAULT/i.exec(action))) {
        const col = tables[tname].columns[a[1].toLowerCase()];
        if (col) delete col.default;
      }
    }
    return;
  }
  if ((m = /^CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+\s+ON\s+(?:public\.)?"?(\w+)"?\s*(?:USING\s+\w+\s*)?\(([^)]+)\)\s*$/i.exec(stmt))) {
    const tname = m[1].toLowerCase();
    if (tables[tname] && !/[()]/.test(m[2])) addUnique(tables[tname], cols(m[2]));
  }
}

function statements(sql) {
  const clean = sql
    .replace(/\$(\w*)\$[\s\S]*?\$\1\$/g, "''")
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*/g, '');
  return clean
    .split(';')
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
}

const order = (f) => {
  const n = /^(\d+)/.exec(f);
  return n ? Number(n[1]) : 10_000;
};
const files = [
  ...readdirSync(join(ROOT, 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join(ROOT, 'supabase/migrations', f)),
  ...readdirSync(join(ROOT, 'scripts'))
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => order(a) - order(b) || a.localeCompare(b))
    .map((f) => join(ROOT, 'scripts', f)),
];
for (const file of files) {
  for (const stmt of statements(readFileSync(file, 'utf8'))) parseStatement(stmt);
}

// Older scripts declare constraints that FULL_SETUP.sql later dropped (some inside
// DO blocks this parser skips), so live tables take their unique keys from FULL_SETUP.
const LIVE_UNIQUES = {
  profiles: [['email']],
  coaches: [['user_id', 'club_id']],
  athletes: [['user_id', 'club_id']],
  announcement_reads: [['announcement_id', 'user_id']],
  tournament_participants: [['tournament_id', 'athlete_id']],
  team_members: [['team_id', 'athlete_id']],
};

const LIVE_TYPE = {
  uuid: 'uuid',
  'timestamp with time zone': 'timestamptz',
  'timestamp without time zone': 'timestamptz',
  date: 'date',
  'time without time zone': 'time',
  jsonb: 'json',
  json: 'json',
  boolean: 'bool',
  integer: 'int',
  int32: 'int',
  int64: 'int',
  bigint: 'int',
  numeric: 'numeric',
  number: 'numeric',
};
for (const [tname, def] of Object.entries(LIVE.tables)) {
  const t = table(tname);
  for (const [cname, c] of Object.entries(def.cols)) {
    const type = c.type?.endsWith('[]') ? 'array' : (LIVE_TYPE[c.type] ?? 'text');
    const col = (t.columns[cname] ??= { type });
    col.type = type;
    if (c.default !== undefined) {
      const d =
        typeof c.default === 'string' ? normDefault(/\(|^[A-Z_]+$/.test(c.default) ? c.default : `'${c.default.replace(/'/g, "''")}'`, type) : { kind: 'value', value: c.default };
      if (d) col.default = d;
    } else {
      delete col.default;
    }
    if (c.pk && !t.pk.includes(cname)) t.pk = [cname];
    if (c.fk) {
      const [rt, rc] = c.fk.split('.');
      const existing = t.fks.find((f) => f.columns.join() === cname);
      if (!existing) addFk(t, `${tname}_${cname}_fkey`, [cname], rt, [rc], '');
      else {
        existing.refTable = rt;
        existing.refColumns = [rc];
      }
    }
  }
  for (const cname of Object.keys(t.columns)) {
    if (!(cname in def.cols)) delete t.columns[cname];
  }
  t.fks = t.fks.filter((f) => f.columns.every((c) => c in def.cols));
  t.uniques = LIVE_UNIQUES[tname] ?? [];
}

for (const t of Object.values(tables)) {
  if (!t.pk.length && t.columns.id) t.pk = ['id'];
}

const sorted = Object.fromEntries(Object.entries(tables).sort(([a], [b]) => a.localeCompare(b)));
const header =
  '// Generated by scripts/mongo/generate-schema.mjs. Do not edit by hand.\n' +
  "import type { DbSchema } from './schema-types';\n\n";
writeFileSync(
  join(ROOT, 'lib/db/schema.generated.ts'),
  `${header}export const SCHEMA: DbSchema = ${JSON.stringify(sorted, null, 2)};\n`
);
console.log(`Generated ${Object.keys(sorted).length} tables`);
