import { SCHEMA } from './schema.generated';
import type { ColumnType, ForeignKey, TableDef } from './schema-types';

const EMPTY: TableDef = { pk: ['id'], columns: {}, uniques: [], fks: [] };

/** Profiles share their id with the user account, so both names point at the same row. */
const USER_TABLES = new Set(['users', 'profiles']);

export function tableDef(table: string): TableDef {
  return SCHEMA[table] ?? EMPTY;
}

export function columnType(table: string, column: string): ColumnType | undefined {
  return SCHEMA[table]?.columns[column]?.type;
}

export function isKnownTable(table: string): boolean {
  return table in SCHEMA;
}

function sameTable(ref: string, table: string): boolean {
  return ref === table || (USER_TABLES.has(ref) && USER_TABLES.has(table));
}

export function singular(name: string): string {
  if (name.endsWith('ies')) return `${name.slice(0, -3)}y`;
  if (/(ches|shes|sses|xes)$/.test(name)) return name.slice(0, -2);
  if (name.endsWith('s')) return name.slice(0, -1);
  return name;
}

export interface Relation {
  table: string;
  /** Column(s) on the parent row; the first non-null one is used. */
  localCols: string[];
  /** Column(s) on the embedded rows; any of them may match. */
  foreignCols: string[];
  many: boolean;
}

function isUniqueColumn(table: string, column: string): boolean {
  const def = tableDef(table);
  if (def.pk.length === 1 && def.pk[0] === column) return true;
  return def.uniques.some((u) => u.length === 1 && u[0] === column);
}

function manyToOne(fks: ForeignKey[], target: string): Relation {
  return {
    table: target,
    localCols: fks.map((f) => f.columns[0]),
    foreignCols: [fks[0].refColumns[0] ?? 'id'],
    many: false,
  };
}

function oneToMany(parent: string, target: string, fks: ForeignKey[]): Relation {
  const foreignCols = fks.map((f) => f.columns[0]);
  return {
    table: target,
    localCols: [fks[0].refColumns[0] ?? 'id'],
    foreignCols,
    many: !foreignCols.every((c) => isUniqueColumn(target, c)),
  };
}

function fkFromName(owner: string, hint: string): string | undefined {
  const prefix = `${owner}_`;
  if (hint.startsWith(prefix) && hint.endsWith('_fkey')) return hint.slice(prefix.length, -'_fkey'.length);
  return undefined;
}

function syntheticFk(column: string, refTable: string): ForeignKey {
  return { name: '', columns: [column], refTable, refColumns: ['id'], onDelete: 'no action' };
}

/**
 * Works out how `embed(...)` inside a select attaches to `parent`, the same way
 * PostgREST follows foreign keys (including `!fkey_name` / `!column` hints).
 */
export function resolveRelation(parent: string, embed: string, hint?: string): Relation | null {
  const parentDef = tableDef(parent);

  // `alias:club_id(...)` embeds through a foreign-key column of the parent.
  if (!isKnownTable(embed)) {
    const fk = parentDef.fks.find((f) => f.columns[0] === embed);
    if (fk) {
      const target = fk.refTable === 'users' ? 'profiles' : fk.refTable;
      return manyToOne([fk], target);
    }
    if (embed.endsWith('_id')) return manyToOne([syntheticFk(embed, 'profiles')], 'profiles');
    return null;
  }

  const target = embed;
  const targetDef = tableDef(target);

  if (hint) {
    const byName = parentDef.fks.filter((f) => f.name === hint && sameTable(f.refTable, target));
    if (byName.length) return manyToOne(byName, target);
    const reverseByName = targetDef.fks.filter((f) => f.name === hint && sameTable(f.refTable, parent));
    if (reverseByName.length) return oneToMany(parent, target, reverseByName);

    const parentCol = fkFromName(parent, hint) ?? (hint in parentDef.columns ? hint : undefined);
    if (parentCol) return manyToOne([syntheticFk(parentCol, target)], target);
    const targetCol = fkFromName(target, hint) ?? (hint in targetDef.columns ? hint : undefined);
    if (targetCol) return oneToMany(parent, target, [syntheticFk(targetCol, parent)]);
  }

  const forward = parentDef.fks.filter((f) => sameTable(f.refTable, target));
  if (forward.length) {
    const preferred = `${singular(target)}_id`;
    forward.sort((a, b) => Number(b.columns[0] === preferred) - Number(a.columns[0] === preferred));
    return manyToOne(forward, target);
  }

  const reverse = targetDef.fks.filter((f) => sameTable(f.refTable, parent));
  if (reverse.length) return oneToMany(parent, target, reverse);

  const guess = `${singular(target)}_id`;
  if (guess in parentDef.columns) return manyToOne([syntheticFk(guess, target)], target);
  const reverseGuess = `${singular(parent)}_id`;
  if (reverseGuess in targetDef.columns) {
    return oneToMany(parent, target, [syntheticFk(reverseGuess, parent)]);
  }
  if (target === 'profiles' && 'user_id' in parentDef.columns) {
    return manyToOne([syntheticFk('user_id', 'profiles')], 'profiles');
  }
  if (parent === 'profiles' && 'user_id' in targetDef.columns) {
    return oneToMany(parent, target, [syntheticFk('user_id', 'profiles')]);
  }
  return null;
}

/** Tables whose foreign keys point at `table`, for cascading deletes. */
export function referencingTables(table: string): { table: string; fk: ForeignKey }[] {
  const out: { table: string; fk: ForeignKey }[] = [];
  for (const [name, def] of Object.entries(SCHEMA)) {
    for (const fk of def.fks) {
      if (fk.refTable === table) out.push({ table: name, fk });
    }
  }
  return out;
}
