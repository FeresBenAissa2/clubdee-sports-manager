import { createDbClient } from './server-client';

/** Full-access client that skips the row policies. Server-only; never import in client components. */
export function createAdminClient() {
  return createDbClient({ service: true });
}
