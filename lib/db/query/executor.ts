/* eslint-disable @typescript-eslint/no-explicit-any -- documents and filter values are dynamic */
import { randomUUID } from 'node:crypto';
import type { Db, Document, Filter } from 'mongodb';
import { canInsert, rowFilter, type Caller } from '../policies';
import { columnType, referencingTables, resolveRelation, tableDef, type Relation } from '../schema';
import type { ColumnType } from '../schema-types';
import { dbError, type DbError, type DbResult, type Row } from '../types';
import { embedKey, parseSelect, type EmbedNode, type SelectNode } from './select-parser';
import type { FilterNode, OrderSpec, QueryState } from './state';

const EMBEDS = Symbol('embeds');
type Doc = Row & { [EMBEDS]?: Record<string, unknown> };

class QueryError extends Error {
  constructor(readonly dbError: DbError) {
    super(dbError.message);
  }
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

const NUMERIC = /^-?\d+(\.\d+)?$/;

/** Converts a value to how the column is stored in MongoDB. */
export function toStored(type: ColumnType | undefined, value: any, fromText = false): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value) && type !== 'json' && type !== 'array') {
    return value.map((v) => toStored(type, v, fromText));
  }
  switch (type) {
    case 'timestamptz': {
      if (value instanceof Date) return value;
      if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date;
      }
      return value;
    }
    case 'date':
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
      return value;
    case 'time':
      if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
      return value;
    case 'int':
    case 'numeric':
      return typeof value === 'string' && NUMERIC.test(value.trim()) ? Number(value) : value;
    case 'bool':
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    case undefined:
      if (fromText && typeof value === 'string') {
        if (value === 'true' || value === 'false') return value === 'true';
        if (NUMERIC.test(value)) return Number(value);
      }
      return value;
    default:
      return value;
  }
}

/** Dates go back to ISO strings, the way PostgREST returned them. */
function toPlain(value: any): any {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out: Row = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

function likeToRegex(pattern: string, fromText: boolean): string {
  let out = '';
  for (const ch of pattern) {
    if (ch === '%' || (fromText && ch === '*')) out += '.*';
    else if (ch === '_') out += '.';
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return `^${out}$`;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function and(...filters: (Filter<Document> | null | undefined)[]): Filter<Document> {
  const parts = filters.filter((f): f is Filter<Document> => !!f && Object.keys(f).length > 0);
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

function condition(table: string, node: Extract<FilterNode, { type: 'cond' }>): Filter<Document> {
  const column = node.path;
  const type = columnType(table, column);
  const value = toStored(type, node.value, node.raw);
  let expr: Filter<Document>;
  switch (node.op) {
    case 'eq':
      expr = { [column]: value };
      break;
    case 'neq':
      expr = { [column]: { $nin: [value, null] } };
      break;
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      expr = { [column]: { [`$${node.op}`]: value } };
      break;
    case 'like':
    case 'ilike':
      expr = {
        [column]: { $regex: likeToRegex(String(node.value), !!node.raw), $options: node.op === 'ilike' ? 'i' : '' },
      };
      break;
    case 'is': {
      const v = node.value === 'null' ? null : node.value === 'true' ? true : node.value === 'false' ? false : node.value;
      if (v === null) return node.negate ? { [column]: { $ne: null } } : { [column]: null };
      expr = { [column]: v };
      break;
    }
    case 'in':
      expr = { [column]: { $in: (value as any[]).map((v) => toStored(type, v, node.raw)) } };
      break;
    case 'cs':
      if (Array.isArray(value)) expr = { [column]: { $all: value } };
      else if (value && typeof value === 'object') {
        expr = and(...Object.entries(value).map(([k, v]) => ({ [`${column}.${k}`]: v })));
      } else expr = { [column]: value };
      break;
    case 'cd':
      expr = { [column]: { $not: { $elemMatch: { $nin: value as any[] } } } };
      break;
    case 'ov':
      expr = { [column]: { $in: value as any[] } };
      break;
  }
  // SQL NOT never matches NULL columns.
  return node.negate ? { $and: [{ [column]: { $ne: null } }, { $nor: [expr] }] } : expr;
}

export function toMongoFilter(table: string, nodes: FilterNode[]): Filter<Document> {
  return and(
    ...nodes.map((node): Filter<Document> => {
      if (node.type === 'cond') return condition(table, node);
      const parts = node.nodes.map((n) => toMongoFilter(table, [n]));
      const group = node.type === 'or' ? { $or: parts } : { $and: parts };
      return node.negate ? { $nor: [group] } : group;
    })
  );
}

function leafPaths(node: FilterNode): string[] {
  return node.type === 'cond' ? [node.path] : node.nodes.flatMap(leafPaths);
}

function stripPrefix(node: FilterNode, prefix: string): FilterNode {
  if (node.type === 'cond') return { ...node, path: node.path.slice(prefix.length + 1) };
  return { ...node, nodes: node.nodes.map((n) => stripPrefix(n, prefix)) };
}

// ---------------------------------------------------------------------------
// Plans: one per table level of a select tree
// ---------------------------------------------------------------------------

interface EmbedPlan {
  node: EmbedNode;
  key: string;
  relation: Relation;
  plan: Plan;
  foreignLimit?: { limit?: number; offset?: number };
}

interface Plan {
  table: string;
  nodes: SelectNode[];
  filters: FilterNode[];
  orders: OrderSpec[];
  /** Parent rows ordered by a column of a to-one embed, e.g. `training_sessions.session_date`. */
  embedOrders: { key: string; column: string; ascending: boolean; nullsFirst?: boolean }[];
  embeds: EmbedPlan[];
}

function buildPlan(
  table: string,
  nodes: SelectNode[],
  filters: FilterNode[],
  orders: OrderSpec[],
  foreignLimits: QueryState['foreignLimits']
): Plan {
  const embedNodes = nodes.filter((n): n is EmbedNode => n.type === 'embed');
  const keys = new Set(embedNodes.map(embedKey));
  const ownerOf = (path: string) => {
    const dot = path.indexOf('.');
    return dot > 0 && keys.has(path.slice(0, dot)) ? path.slice(0, dot) : null;
  };

  const local: FilterNode[] = [];
  const nested: Record<string, FilterNode[]> = {};
  for (const filter of filters) {
    const owners = new Set(leafPaths(filter).map(ownerOf));
    if (owners.size === 1 && !owners.has(null)) {
      const owner = [...owners][0] as string;
      (nested[owner] ??= []).push(stripPrefix(filter, owner));
    } else if (owners.has(null) && owners.size === 1) {
      local.push(filter);
    } else {
      throw new QueryError(dbError('A filter group cannot mix columns from different tables', 'PGRST100'));
    }
  }

  const localOrders: OrderSpec[] = [];
  const embedOrders: Plan['embedOrders'] = [];
  const nestedOrders: Record<string, OrderSpec[]> = {};
  for (const order of orders) {
    if (order.foreignTable) {
      const [head, ...rest] = order.foreignTable.split('.');
      (nestedOrders[head] ??= []).push({ ...order, foreignTable: rest.join('.') || undefined });
      continue;
    }
    const owner = ownerOf(order.column);
    if (owner) embedOrders.push({ ...order, key: owner, column: order.column.slice(owner.length + 1) });
    else localOrders.push(order);
  }

  const nestedLimits: Record<string, QueryState['foreignLimits']> = {};
  for (const [path, limit] of Object.entries(foreignLimits)) {
    const [head, ...rest] = path.split('.');
    if (rest.length) (nestedLimits[head] ??= {})[rest.join('.')] = limit;
  }

  const embeds = embedNodes.map((node): EmbedPlan => {
    const key = embedKey(node);
    const relation = resolveRelation(table, node.name, node.hint);
    if (!relation) {
      throw new QueryError(
        dbError(
          `Could not find a relationship between '${table}' and '${node.name}' in the schema cache`,
          'PGRST200'
        )
      );
    }
    return {
      node,
      key,
      relation,
      foreignLimit: foreignLimits[key],
      plan: buildPlan(relation.table, node.children, nested[key] ?? [], nestedOrders[key] ?? [], nestedLimits[key] ?? {}),
    };
  });

  return { table, nodes, filters: local, orders: localOrders, embedOrders, embeds };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

interface ReadOptions {
  base?: Filter<Document>;
  limit?: number;
  offset?: number;
  count?: boolean;
  rowsNeeded?: boolean;
}

function values(rows: Row[], columns: string[]): unknown[] {
  const out = new Set<unknown>();
  for (const row of rows) for (const c of columns) if (row[c] !== null && row[c] !== undefined) out.add(row[c]);
  return [...out];
}

function anyIn(columns: string[], keys: unknown[]): Filter<Document> {
  const parts = columns.map((c) => ({ [c]: { $in: keys } }));
  return parts.length === 1 ? parts[0] : { $or: parts };
}

class Reader {
  constructor(
    private readonly db: Db,
    private readonly caller: Caller
  ) {}

  /** Filter for a plan's own rows, including `!inner` embeds pushed down as key lists. */
  private async filterFor(plan: Plan, base?: Filter<Document>): Promise<Filter<Document> | false> {
    const access = rowFilter(plan.table, 'select', this.caller);
    if (access === false) return false;
    const parts: Filter<Document>[] = [base ?? {}, access ?? {}, toMongoFilter(plan.table, plan.filters)];
    for (const embed of plan.embeds) {
      if (!embed.node.inner) continue;
      const childFilter = await this.filterFor(embed.plan);
      if (childFilter === false) return false;
      const children = await this.db
        .collection(embed.plan.table)
        .find(childFilter, { projection: Object.fromEntries(embed.relation.foreignCols.map((c) => [c, 1])) })
        .toArray();
      const keys = values(children, embed.relation.foreignCols);
      parts.push(anyIn(embed.relation.localCols, keys));
    }
    return and(...parts);
  }

  async read(plan: Plan, options: ReadOptions = {}): Promise<{ rows: Doc[]; count: number | null }> {
    const filter = await this.filterFor(plan, options.base);
    if (filter === false) return { rows: [], count: options.count ? 0 : null };
    const collection = this.db.collection(plan.table);
    const count = options.count ? await collection.countDocuments(filter) : null;
    if (options.rowsNeeded === false) return { rows: [], count };

    const sortInJs = plan.embedOrders.length > 0;
    const pipeline: Document[] = [{ $match: filter }];
    if (plan.orders.length) {
      const flags: Document = {};
      const sort: Document = {};
      plan.orders.forEach((order, i) => {
        const nullsFirst = order.nullsFirst ?? !order.ascending;
        flags[`__null${i}`] = {
          $cond: [{ $eq: [{ $ifNull: [`$${order.column}`, null] }, null] }, nullsFirst ? 0 : 1, nullsFirst ? 1 : 0],
        };
        sort[`__null${i}`] = 1;
        sort[order.column] = order.ascending ? 1 : -1;
      });
      pipeline.push({ $addFields: flags }, { $sort: sort }, { $project: Object.fromEntries(Object.keys(flags).map((k) => [k, 0])) });
    }
    if (!sortInJs) {
      if (options.offset) pipeline.push({ $skip: options.offset });
      if (options.limit !== undefined) pipeline.push({ $limit: options.limit });
    }

    let rows = (await collection.aggregate(pipeline).toArray()) as Doc[];
    await this.attachEmbeds(plan, rows);

    if (plan.embeds.some((e) => e.node.inner)) {
      rows = rows.filter((row) =>
        plan.embeds.every((e) => {
          if (!e.node.inner) return true;
          const value = row[EMBEDS]?.[e.key];
          return Array.isArray(value) ? value.length > 0 : value != null;
        })
      );
    }

    if (sortInJs) {
      rows.sort((a, b) => {
        for (const order of plan.embedOrders) {
          const av = (a[EMBEDS]?.[order.key] as Row | null)?.[order.column] ?? null;
          const bv = (b[EMBEDS]?.[order.key] as Row | null)?.[order.column] ?? null;
          if (av === bv) continue;
          const nullsFirst = order.nullsFirst ?? !order.ascending;
          if (av === null) return nullsFirst ? -1 : 1;
          if (bv === null) return nullsFirst ? 1 : -1;
          return (av < bv ? -1 : 1) * (order.ascending ? 1 : -1);
        }
        return 0;
      });
      const start = options.offset ?? 0;
      rows = rows.slice(start, options.limit !== undefined ? start + options.limit : undefined);
    }
    return { rows, count };
  }

  private async attachEmbeds(plan: Plan, rows: Doc[]): Promise<void> {
    for (const embed of plan.embeds) {
      const { relation } = embed;
      const keys = values(rows, relation.localCols);
      const { rows: children } = keys.length
        ? await this.read(embed.plan, { base: anyIn(relation.foreignCols, keys) })
        : { rows: [] as Doc[] };

      const byKey = new Map<unknown, Doc[]>();
      for (const child of children) {
        for (const column of relation.foreignCols) {
          const key = child[column];
          if (key === null || key === undefined) continue;
          const list = byKey.get(key) ?? [];
          if (!list.includes(child)) list.push(child);
          byKey.set(key, list);
        }
      }

      for (const row of rows) {
        const key = relation.localCols.map((c) => row[c]).find((v) => v !== null && v !== undefined);
        let matches = key === undefined ? [] : (byKey.get(key) ?? []);
        if (embed.foreignLimit) {
          const start = embed.foreignLimit.offset ?? 0;
          const end = embed.foreignLimit.limit !== undefined ? start + embed.foreignLimit.limit : undefined;
          matches = matches.slice(start, end);
        }
        row[EMBEDS] ??= {};
        row[EMBEDS][embed.key] = relation.many ? matches : (matches[0] ?? null);
      }
    }
  }
}

function project(plan: Plan, row: Doc): Row {
  const out: Row = {};
  for (const node of plan.nodes) {
    if (node.type === 'star') {
      for (const [k, v] of Object.entries(row)) if (k !== '_id') out[k] = toPlain(v);
    } else if (node.type === 'column') {
      out[node.alias ?? node.name] = node.name in row ? toPlain(row[node.name]) : null;
    }
  }
  for (const embed of plan.embeds) {
    const value = row[EMBEDS]?.[embed.key];
    const onlyCount =
      embed.node.children.length === 1 &&
      embed.node.children[0].type === 'column' &&
      embed.node.children[0].name === 'count';
    if (Array.isArray(value)) {
      out[embed.key] = onlyCount ? [{ count: value.length }] : value.map((v) => project(embed.plan, v));
    } else {
      out[embed.key] = value ? project(embed.plan, value as Doc) : null;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

function defaultValue(kind: string, value: unknown, type: ColumnType): unknown {
  if (kind === 'uuid') return randomUUID();
  if (kind === 'now') return new Date();
  if (kind === 'today') return new Date().toISOString().slice(0, 10);
  return type === 'timestamptz' ? toStored(type, value) : structuredClone(value);
}

export function prepareInsert(table: string, row: Row, nullColumns: string[] = []): Doc {
  const def = tableDef(table);
  const doc: Doc = {};
  for (const [column, value] of Object.entries(row)) {
    if (value !== undefined) doc[column] = toStored(columnType(table, column), value);
  }
  for (const column of nullColumns) if (!(column in doc)) doc[column] = null;
  for (const [column, col] of Object.entries(def.columns)) {
    if (!(column in doc) && col.default) doc[column] = defaultValue(col.default.kind, (col.default as { value?: unknown }).value, col.type);
  }
  if (def.pk.length === 1 && doc[def.pk[0]] !== undefined && doc[def.pk[0]] !== null) {
    doc._id = doc[def.pk[0]];
  }
  return doc;
}

function prepareUpdate(table: string, values: Row): Row {
  const set: Row = {};
  for (const [column, value] of Object.entries(values)) {
    if (value !== undefined) set[column] = toStored(columnType(table, column), value);
  }
  if ('updated_at' in tableDef(table).columns && values.updated_at === undefined) set.updated_at = new Date();
  return set;
}

function writeError(error: unknown): DbError {
  const e = error as { code?: number; message?: string; keyPattern?: Record<string, unknown> };
  if (e?.code === 11000) {
    const keys = Object.keys(e.keyPattern ?? {}).join(', ');
    return dbError('duplicate key value violates unique constraint', '23505', keys ? `Key (${keys}) already exists.` : null);
  }
  if (error instanceof QueryError) return error.dbError;
  return dbError(e?.message ?? 'Database error', 'XX000');
}

/** Applies ON DELETE CASCADE / SET NULL for rows about to be removed from `table`. */
export async function cascadeDelete(db: Db, table: string, rows: Row[], depth = 0): Promise<void> {
  if (!rows.length || depth > 6) return;
  for (const { table: child, fk } of referencingTables(table)) {
    const keys = values(rows, [fk.refColumns[0] ?? 'id']);
    if (!keys.length) continue;
    const filter = { [fk.columns[0]]: { $in: keys } };
    if (fk.onDelete === 'cascade') {
      const doomed = await db.collection(child).find(filter).toArray();
      await cascadeDelete(db, child, doomed, depth + 1);
      await db.collection(child).deleteMany(filter);
    } else if (fk.onDelete === 'set null') {
      await db.collection(child).updateMany(filter, { $set: { [fk.columns[0]]: null } });
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function result(data: any, count: number | null = null, status = 200): DbResult {
  return { data, error: null, count, status, statusText: status === 201 ? 'Created' : 'OK' };
}

function failure(error: DbError, status = 400): DbResult {
  return { data: null, error, count: null, status, statusText: 'Error' };
}

function applySingle(state: QueryState, rows: Row[], count: number | null): DbResult {
  if (!state.single) return result(rows, count);
  if (rows.length === 1) return result(rows[0], count);
  if (rows.length === 0 && state.single === 'maybeSingle') return result(null, count);
  return failure(
    dbError('JSON object requested, multiple (or no) rows returned', 'PGRST116', `The result contains ${rows.length} rows`),
    406
  );
}

export async function executeQuery(db: Db, state: QueryState, caller: Caller): Promise<DbResult> {
  try {
    const plan = buildPlan(state.table, parseSelect(state.select), state.filters, state.orders, state.foreignLimits);
    const reader = new Reader(db, caller);
    const collection = db.collection(state.table);

    const returnRows = async (ids: unknown[]): Promise<DbResult> => {
      if (!state.returning) return result(null, null, state.action === 'insert' ? 201 : 204);
      const readPlan = { ...plan, filters: [] };
      const { rows } = await new Reader(db, { ...caller, service: true }).read(readPlan, { base: { _id: { $in: ids as never[] } } });
      const order = new Map(ids.map((id, i) => [String(id), i]));
      rows.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
      return applySingle(state, rows.map((r) => project(plan, r)), null);
    };

    switch (state.action) {
      case 'select': {
        const { rows, count } = await reader.read(plan, {
          limit: state.limit,
          offset: state.offset,
          count: !!state.count,
          rowsNeeded: !state.head,
        });
        if (state.head) return result(null, count);
        return applySingle(state, rows.map((r) => project(plan, r)), count);
      }

      case 'insert': {
        const input: Row[] = Array.isArray(state.values) ? state.values : [state.values];
        if (input.some((row) => !canInsert(state.table, caller, row))) {
          return failure(dbError(`new row violates row-level security policy for table "${state.table}"`, '42501'), 403);
        }
        const union = input.length > 1 && state.defaultToNull !== false ? [...new Set(input.flatMap(Object.keys))] : [];
        const docs = input.map((row) => prepareInsert(state.table, row, union));
        if (!docs.length) return returnRows([]);
        const inserted = await collection.insertMany(docs, { ordered: true });
        return returnRows(Object.values(inserted.insertedIds));
      }

      case 'upsert': {
        const input: Row[] = Array.isArray(state.values) ? state.values : [state.values];
        if (input.some((row) => !canInsert(state.table, caller, row))) {
          return failure(dbError(`new row violates row-level security policy for table "${state.table}"`, '42501'), 403);
        }
        const def = tableDef(state.table);
        const conflict = state.onConflict ? state.onConflict.split(',').map((c) => c.trim()) : def.pk;
        const ids: unknown[] = [];
        for (const row of input) {
          const match = Object.fromEntries(conflict.map((c) => [c, toStored(columnType(state.table, c), row[c])]));
          const existing = conflict.every((c) => row[c] !== undefined) ? await collection.findOne(match) : null;
          if (existing) {
            if (state.ignoreDuplicates) continue;
            await collection.updateOne({ _id: existing._id }, { $set: prepareUpdate(state.table, row) });
            ids.push(existing._id);
          } else {
            const doc = prepareInsert(state.table, row, []);
            const { insertedId } = await collection.insertOne(doc);
            ids.push(insertedId);
          }
        }
        return returnRows(ids);
      }

      case 'update': {
        const access = rowFilter(state.table, 'update', caller);
        if (access === false) return returnRows([]);
        const filter = and(access, toMongoFilter(state.table, plan.filters));
        const ids = (await collection.find(filter, { projection: { _id: 1 } }).toArray()).map((d) => d._id);
        if (ids.length) {
          await collection.updateMany({ _id: { $in: ids } }, { $set: prepareUpdate(state.table, state.values ?? {}) });
        }
        return returnRows(ids);
      }

      case 'delete': {
        const access = rowFilter(state.table, 'delete', caller);
        if (access === false) return state.returning ? applySingle(state, [], null) : result(null, null, 204);
        const filter = and(access, toMongoFilter(state.table, plan.filters));
        const doomed = await collection.find(filter).toArray();
        await cascadeDelete(db, state.table, doomed);
        if (doomed.length) await collection.deleteMany({ _id: { $in: doomed.map((d) => d._id) } });
        if (!state.returning) return result(null, null, 204);
        return applySingle(state, doomed.map((d) => project({ ...plan, embeds: [] }, d)), null);
      }
    }
  } catch (error) {
    return failure(writeError(error));
  }
}
