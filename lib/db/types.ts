/* eslint-disable @typescript-eslint/no-explicit-any -- rows are dynamic documents */

export type Row = Record<string, any>;

export interface DbError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
  name?: string;
}

export interface DbResult<T = any> {
  data: T;
  error: DbError | null;
  count: number | null;
  status: number;
  statusText: string;
}

export type AppRole = 'admin' | 'coach' | 'athlete' | 'parent';

/** Same shape the app used to get from Supabase Auth. */
export interface User {
  id: string;
  email: string;
  aud: string;
  role?: string;
  email_confirmed_at?: string | null;
  phone?: string;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
  identities?: unknown[];
}

export interface Session {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: User;
}

export interface AuthError {
  message: string;
  name: string;
  status: number;
  code?: string;
}

export function dbError(message: string, code?: string, details?: string | null): DbError {
  return { message, code, details: details ?? null, hint: null };
}

export function authError(message: string, status = 400, code?: string): AuthError {
  return { message, name: 'AuthApiError', status, code };
}
