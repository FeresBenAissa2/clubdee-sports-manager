import { cookies } from 'next/headers';
import { createDbClient, type DbClient } from './server-client';

/**
 * Database client for Server Components, Server Actions and Route Handlers.
 * Queries run as the signed-in user (session cookie) under the app's access rules.
 */
export async function createClient(): Promise<DbClient> {
  const store = await cookies();
  return createDbClient({
    cookies: {
      get: (name) => store.get(name)?.value,
      set: (name, value, options) => {
        try {
          store.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; the next Server Action or route will.
        }
      },
    },
  });
}

export type { DbClient };
