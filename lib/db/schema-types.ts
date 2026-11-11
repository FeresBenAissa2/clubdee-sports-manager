export type ColumnType =
  | 'uuid'
  | 'text'
  | 'int'
  | 'numeric'
  | 'bool'
  | 'timestamptz'
  | 'date'
  | 'time'
  | 'json'
  | 'array';

export type ColumnDefault =
  | { kind: 'uuid' }
  | { kind: 'now' }
  | { kind: 'today' }
  | { kind: 'value'; value: unknown };

export interface ColumnDef {
  type: ColumnType;
  default?: ColumnDefault;
}

export interface ForeignKey {
  name: string;
  columns: string[];
  /** `users` stands for the old `auth.users` table. */
  refTable: string;
  refColumns: string[];
  onDelete: string;
}

export interface TableDef {
  pk: string[];
  columns: Record<string, ColumnDef>;
  uniques: string[][];
  fks: ForeignKey[];
}

export type DbSchema = Record<string, TableDef>;
