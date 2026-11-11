/* eslint-disable @typescript-eslint/no-explicit-any -- the builder mirrors a dynamic, untyped API */
import type { DbResult } from '../types';
import { conditionFromText, parseOrFilter } from './filter-syntax';
import { emptyState, type FilterOp, type QueryState } from './state';

export type QueryExecutor = (state: QueryState) => Promise<DbResult>;

/** What the server and browser clients have in common. */
export interface QueryClient {
  from<T = any>(table: string): QueryBuilder<T>;
}

type CountOption = { count?: 'exact' | 'planned' | 'estimated' };
type ForeignOption = { foreignTable?: string; referencedTable?: string };

/**
 * Chainable query, e.g. `db.from('athletes').select('*, clubs(name)').eq('club_id', id)`.
 * It only records what was asked for; awaiting it hands the state to the executor
 * (MongoDB on the server, the /api/db route in the browser).
 */
export class QueryBuilder<T = any, Result = T[]> implements PromiseLike<DbResult<Result>> {
  private state: QueryState;
  private shouldThrow = false;

  constructor(
    private readonly execute: QueryExecutor,
    table: string
  ) {
    this.state = emptyState(table);
  }

  select(columns = '*', options: CountOption & { head?: boolean } = {}): this {
    if (this.state.action === 'select') {
      this.state.select = columns;
      this.state.count = options.count;
      this.state.head = options.head;
    } else {
      this.state.returning = true;
      this.state.select = columns;
    }
    return this;
  }

  insert(values: any, options: CountOption & { defaultToNull?: boolean } = {}): this {
    this.state.action = 'insert';
    this.state.values = values;
    this.state.count = options.count;
    this.state.defaultToNull = options.defaultToNull;
    return this;
  }

  upsert(
    values: any,
    options: CountOption & { onConflict?: string; ignoreDuplicates?: boolean; defaultToNull?: boolean } = {}
  ): this {
    this.state.action = 'upsert';
    this.state.values = values;
    this.state.onConflict = options.onConflict;
    this.state.ignoreDuplicates = options.ignoreDuplicates;
    this.state.defaultToNull = options.defaultToNull;
    return this;
  }

  update(values: any, options: CountOption = {}): this {
    this.state.action = 'update';
    this.state.values = values;
    this.state.count = options.count;
    return this;
  }

  delete(options: CountOption = {}): this {
    this.state.action = 'delete';
    this.state.count = options.count;
    return this;
  }

  private cond(path: string, op: FilterOp, value: any, negate = false): this {
    this.state.filters.push({ type: 'cond', path, op, value, negate });
    return this;
  }

  eq(column: string, value: any): this {
    return this.cond(column, 'eq', value);
  }
  neq(column: string, value: any): this {
    return this.cond(column, 'neq', value);
  }
  gt(column: string, value: any): this {
    return this.cond(column, 'gt', value);
  }
  gte(column: string, value: any): this {
    return this.cond(column, 'gte', value);
  }
  lt(column: string, value: any): this {
    return this.cond(column, 'lt', value);
  }
  lte(column: string, value: any): this {
    return this.cond(column, 'lte', value);
  }
  like(column: string, pattern: string): this {
    return this.cond(column, 'like', pattern);
  }
  ilike(column: string, pattern: string): this {
    return this.cond(column, 'ilike', pattern);
  }
  is(column: string, value: null | boolean): this {
    return this.cond(column, 'is', value);
  }
  in(column: string, values: readonly any[]): this {
    return this.cond(column, 'in', [...values]);
  }
  contains(column: string, value: any): this {
    return this.cond(column, 'cs', value);
  }
  containedBy(column: string, value: any): this {
    return this.cond(column, 'cd', value);
  }
  overlaps(column: string, value: any): this {
    return this.cond(column, 'ov', value);
  }

  match(query: Record<string, any>): this {
    for (const [column, value] of Object.entries(query)) this.eq(column, value);
    return this;
  }

  not(column: string, operator: string, value: any): this {
    if (typeof value === 'string' || operator === 'in') {
      const text = Array.isArray(value) ? `(${value.join(',')})` : String(value);
      const node = conditionFromText(column, operator, text);
      if (node.type === 'cond') node.negate = !node.negate;
      this.state.filters.push(node);
      return this;
    }
    return this.cond(column, operator as FilterOp, value, true);
  }

  filter(column: string, operator: string, value: any): this {
    if (typeof value === 'string') {
      this.state.filters.push(conditionFromText(column, operator, value));
      return this;
    }
    const negate = operator.startsWith('not.');
    return this.cond(column, (negate ? operator.slice(4) : operator) as FilterOp, value, negate);
  }

  or(filters: string, options: ForeignOption = {}): this {
    const prefix = options.referencedTable ?? options.foreignTable ?? '';
    this.state.filters.push(parseOrFilter(filters, prefix));
    return this;
  }

  order(
    column: string,
    options: { ascending?: boolean; nullsFirst?: boolean } & ForeignOption = {}
  ): this {
    this.state.orders.push({
      column,
      ascending: options.ascending ?? true,
      nullsFirst: options.nullsFirst,
      foreignTable: options.referencedTable ?? options.foreignTable,
    });
    return this;
  }

  limit(count: number, options: ForeignOption = {}): this {
    const foreign = options.referencedTable ?? options.foreignTable;
    if (foreign) {
      this.state.foreignLimits[foreign] = { ...this.state.foreignLimits[foreign], limit: count };
    } else {
      this.state.limit = count;
    }
    return this;
  }

  range(from: number, to: number, options: ForeignOption = {}): this {
    const foreign = options.referencedTable ?? options.foreignTable;
    if (foreign) {
      this.state.foreignLimits[foreign] = { offset: from, limit: to - from + 1 };
    } else {
      this.state.offset = from;
      this.state.limit = to - from + 1;
    }
    return this;
  }

  single<U = T>(): QueryBuilder<U, U> {
    this.state.single = 'single';
    return this as unknown as QueryBuilder<U, U>;
  }

  maybeSingle<U = T>(): QueryBuilder<U, U | null> {
    this.state.single = 'maybeSingle';
    return this as unknown as QueryBuilder<U, U | null>;
  }

  /** Overrides the type of `data`. */
  returns<U>(): QueryBuilder<T, U> {
    return this as unknown as QueryBuilder<T, U>;
  }

  abortSignal(): this {
    return this;
  }

  throwOnError(): this {
    this.shouldThrow = true;
    return this;
  }

  /** Plain snapshot of the query, e.g. to send it over HTTP. */
  toJSON(): QueryState {
    return this.state;
  }

  then<R1 = DbResult<Result>, R2 = never>(
    onfulfilled?: ((value: DbResult<Result>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return this.execute(this.state)
      .then((result) => {
        if (this.shouldThrow && result.error) throw result.error;
        return result as DbResult<Result>;
      })
      .then(onfulfilled, onrejected);
  }
}
