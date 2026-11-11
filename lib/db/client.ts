/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- mirrors the old client surface, including arguments it ignores */
'use client';

import { QueryBuilder } from './query/builder';
import type { QueryState } from './query/state';
import { dbError, type DbResult, type Row, type Session, type User } from './types';

type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED';
type Listener = (event: AuthEvent, session: Session | null) => void;

const listeners = new Set<Listener>();

async function call(body: Row): Promise<any> {
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (error) {
    return {
      data: null,
      error: dbError((error as Error).message || 'Network error', 'NETWORK'),
      count: null,
      status: 0,
      statusText: 'Network error',
    };
  }
}

const runQuery = (state: QueryState): Promise<DbResult> => call({ kind: 'query', state });

async function authCall(method: string, args?: unknown, event?: AuthEvent) {
  const result = await call({ kind: 'auth', method, args });
  if (event && !result.error) {
    const session = result.data?.session ?? null;
    listeners.forEach((listener) => listener(event, event === 'SIGNED_OUT' ? null : session));
  }
  return result;
}

function bucket(name: string) {
  const url = (path: string) =>
    `/api/storage/${encodeURIComponent(name)}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return {
    async upload(
      path: string,
      file: Blob | ArrayBuffer | string,
      options: { contentType?: string; upsert?: boolean; cacheControl?: string } = {}
    ) {
      const res = await fetch(url(path), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': options.contentType ?? (file instanceof Blob && file.type ? file.type : 'application/octet-stream'),
          'x-upsert': String(!!options.upsert),
        },
        body: file,
      });
      return res.json();
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: url(path) } };
    },
    async createSignedUrl(path: string, _expiresIn?: number) {
      return { data: { signedUrl: url(path) }, error: null };
    },
    async download(path: string) {
      const res = await fetch(url(path), { credentials: 'same-origin' });
      if (!res.ok) return { data: null, error: dbError('Object not found', String(res.status)) };
      return { data: await res.blob(), error: null };
    },
    async remove(paths: string[]) {
      const res = await fetch(`/api/storage/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
      return res.json();
    },
  };
}

/** Database client for Client Components; every call goes through the /api/db route. */
export function createClient() {
  return {
    from<T = any>(table: string) {
      return new QueryBuilder<T>(runQuery, table);
    },
    rpc(fn: string, args?: Row): Promise<DbResult> {
      return call({ kind: 'rpc', fn, args });
    },
    storage: { from: bucket },
    auth: {
      getUser: (): Promise<{ data: { user: User | null }; error: any }> => authCall('getUser'),
      getSession: (): Promise<{ data: { session: Session | null }; error: any }> => authCall('getSession'),
      signInWithPassword: (credentials: { email: string; password: string }) =>
        authCall('signInWithPassword', credentials, 'SIGNED_IN'),
      signUp: (params: { email: string; password: string; options?: { data?: Row } }) =>
        authCall('signUp', params, 'SIGNED_IN'),
      signOut: () => authCall('signOut', undefined, 'SIGNED_OUT'),
      updateUser: (changes: { email?: string; password?: string; data?: Row }) =>
        authCall('updateUser', changes, 'USER_UPDATED'),
      onAuthStateChange(listener: Listener) {
        listeners.add(listener);
        void authCall('getSession').then((result) => {
          if (listeners.has(listener)) listener('INITIAL_SESSION', result.data?.session ?? null);
        });
        return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
      },
    },
  };
}

export type BrowserDbClient = ReturnType<typeof createClient>;
