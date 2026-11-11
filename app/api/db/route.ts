import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/db/server';
import { emptyState, type QueryState } from '@/lib/db/query/state';
import { dbError } from '@/lib/db/types';

/** Auth methods the browser client may call; admin operations stay server-only. */
const AUTH_METHODS = new Set(['getUser', 'getSession', 'signInWithPassword', 'signUp', 'signOut', 'updateUser']);

const bad = (message: string) =>
  NextResponse.json(
    { data: null, error: dbError(message, 'BAD_REQUEST'), count: null, status: 400, statusText: 'Bad Request' },
    { status: 400 }
  );

/**
 * Runs queries from Client Components on the server, as the signed-in user, under
 * the same access rules as server code.
 */
export async function POST(request: NextRequest) {
  let body: { kind?: string; state?: Partial<QueryState>; fn?: string; method?: string; args?: unknown };
  try {
    body = await request.json();
  } catch {
    return bad('Invalid JSON body');
  }

  const db = await createClient();

  if (body.kind === 'query' && typeof body.state?.table === 'string') {
    return NextResponse.json(await db.execute({ ...emptyState(body.state.table), ...body.state }));
  }
  if (body.kind === 'rpc' && typeof body.fn === 'string') {
    return NextResponse.json(await db.rpc(body.fn, (body.args ?? {}) as Record<string, unknown>));
  }
  if (body.kind === 'auth' && typeof body.method === 'string' && AUTH_METHODS.has(body.method)) {
    const auth = db.auth as unknown as Record<string, (args?: unknown) => Promise<unknown>>;
    return NextResponse.json(await auth[body.method](body.args));
  }
  return bad('Unsupported request');
}
