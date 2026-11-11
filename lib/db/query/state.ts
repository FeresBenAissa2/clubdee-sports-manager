/* eslint-disable @typescript-eslint/no-explicit-any -- filter values are arbitrary JSON */

export type FilterOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'is'
  | 'in'
  | 'cs'
  | 'cd'
  | 'ov';

export type FilterNode =
  | {
      type: 'cond';
      /** `column`, or `embed.column` for a filter on an embedded resource. */
      path: string;
      op: FilterOp;
      value: any;
      negate?: boolean;
      /** Value came from a PostgREST filter string, so it is still text. */
      raw?: boolean;
    }
  | { type: 'or' | 'and'; nodes: FilterNode[]; negate?: boolean };

export interface OrderSpec {
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
  /** Orders the rows of an embedded resource instead of the parent rows. */
  foreignTable?: string;
}

export type QueryAction = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

export interface QueryState {
  table: string;
  action: QueryAction;
  select: string;
  /** For mutations: `.select()` was chained, so return the affected rows. */
  returning: boolean;
  values?: any;
  filters: FilterNode[];
  orders: OrderSpec[];
  limit?: number;
  offset?: number;
  foreignLimits: Record<string, { limit?: number; offset?: number }>;
  single?: 'single' | 'maybeSingle';
  count?: 'exact' | 'planned' | 'estimated';
  head?: boolean;
  onConflict?: string;
  ignoreDuplicates?: boolean;
  defaultToNull?: boolean;
}

export function emptyState(table: string): QueryState {
  return {
    table,
    action: 'select',
    select: '*',
    returning: false,
    filters: [],
    orders: [],
    foreignLimits: {},
  };
}
