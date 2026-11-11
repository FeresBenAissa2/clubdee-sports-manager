/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- mirrors the old client surface, including arguments it ignores */
import { randomBytes } from 'node:crypto';
import {
  checkPassword,
  createUser,
  deleteUser,
  findUserById,
  toUser,
  updateUser,
  users,
  type UserDoc,
} from './auth/users';
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from './auth/tokens';
import { getDb } from './mongo';
import type { Caller } from './policies';
import { QueryBuilder } from './query/builder';
import { executeQuery } from './query/executor';
import type { QueryState } from './query/state';
import { executeRpc } from './rpc';
import { serverBucket } from './storage';
import { authError, type AppRole, type AuthError, type DbResult, type Row, type Session, type User } from './types';

export interface CookieAdapter {
  get(name: string): string | undefined;
  set(name: string, value: string, options: ReturnType<typeof sessionCookieOptions>): void;
}

export interface DbClientOptions {
  cookies?: CookieAdapter;
  /** Full access, no row policies (what the Supabase service-role key used to do). */
  service?: boolean;
}

function sessionFor(doc: UserDoc, token: string, exp: number): Session {
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: Math.max(0, exp - Math.floor(Date.now() / 1000)),
    expires_at: exp,
    refresh_token: '',
    user: toUser(doc),
  };
}

const noSession = () => authError('Auth session missing!', 400, 'session_missing');

export function createDbClient(options: DbClientOptions = {}) {
  let current: { doc: UserDoc | null; token: string | null; exp: number } | undefined;
  let role: Promise<AppRole | null> | undefined;

  async function session() {
    if (current) return current;
    const token = options.cookies?.get(SESSION_COOKIE) ?? null;
    const claims = verifySession(token);
    const doc = claims ? await findUserById(await getDb(), claims.sub) : null;
    current = { doc, token: doc ? token : null, exp: claims?.exp ?? 0 };
    return current;
  }

  function startSession(doc: UserDoc) {
    const { token, claims } = signSession(doc.id, doc.email);
    options.cookies?.set(SESSION_COOKIE, token, sessionCookieOptions());
    current = { doc, token, exp: claims.exp };
    role = undefined;
    return sessionFor(doc, token, claims.exp);
  }

  async function caller(): Promise<Caller> {
    if (options.service) return { service: true, userId: null, role: null };
    const { doc } = await session();
    if (!doc) return { service: false, userId: null, role: null };
    role ??= getDb()
      .then((db) => db.collection('user_roles').findOne({ user_id: doc.id }))
      .then((r) => (r?.role as AppRole) ?? null);
    return { service: false, userId: doc.id, role: await role };
  }

  async function requireAdmin() {
    const who = await caller();
    return who.service || who.role === 'admin' ? null : authError('User not allowed', 403, 'not_admin');
  }

  const run = async (state: QueryState): Promise<DbResult> => executeQuery(await getDb(), state, await caller());

  const auth = {
    async getUser(): Promise<{ data: { user: User | null }; error: ReturnType<typeof authError> | null }> {
      const { doc } = await session();
      return doc ? { data: { user: toUser(doc) }, error: null } : { data: { user: null }, error: noSession() };
    },

    async getSession(): Promise<{ data: { session: Session | null }; error: null }> {
      const s = await session();
      return { data: { session: s.doc && s.token ? sessionFor(s.doc, s.token, s.exp) : null }, error: null };
    },

    async refreshSession() {
      const s = await session();
      if (!s.doc) return { data: { user: null, session: null }, error: noSession() };
      return { data: { user: toUser(s.doc), session: startSession(s.doc) }, error: null };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const doc = await checkPassword(await getDb(), email, password);
      if (!doc) {
        return {
          data: { user: null, session: null },
          error: authError('Invalid login credentials', 400, 'invalid_credentials'),
        };
      }
      const s = startSession(doc);
      return { data: { user: s.user, session: s }, error: null };
    },

    async signUp({ email, password, options: opts }: { email: string; password: string; options?: { data?: Row } }) {
      const { user, error } = await createUser(await getDb(), { email, password, user_metadata: opts?.data });
      if (error || !user) return { data: { user: null, session: null }, error };
      const s = startSession(user);
      return { data: { user: s.user, session: s }, error: null };
    },

    async signOut(_options?: { scope?: 'global' | 'local' | 'others' }): Promise<{ error: AuthError | null }> {
      options.cookies?.set(SESSION_COOKIE, '', sessionCookieOptions(0));
      current = { doc: null, token: null, exp: 0 };
      role = undefined;
      return { error: null };
    },

    async updateUser(changes: { email?: string; password?: string; data?: Row }) {
      const { doc } = await session();
      if (!doc) return { data: { user: null }, error: noSession() };
      const { user, error } = await updateUser(await getDb(), doc.id, changes);
      if (user) current = { ...(current as NonNullable<typeof current>), doc: user };
      return { data: { user: user ? toUser(user) : null }, error };
    },

    // Email flows are off (see lib/auth/actions.ts); accept the calls so callers keep working.
    async resetPasswordForEmail(_email: string, _options?: unknown): Promise<{ data: object; error: AuthError | null }> {
      return { data: {}, error: null };
    },
    async resend(_params: unknown): Promise<{ data: { user: null; session: null }; error: AuthError | null }> {
      return { data: { user: null, session: null }, error: null };
    },
    async verifyOtp(_params: unknown) {
      return {
        data: { user: null, session: null },
        error: authError('Email verification codes are not enabled', 400, 'otp_disabled'),
      };
    },
    async exchangeCodeForSession(_code: string) {
      const s = await session();
      return {
        data: { user: s.doc ? toUser(s.doc) : null, session: s.doc && s.token ? sessionFor(s.doc, s.token, s.exp) : null },
        error: null,
      };
    },
    onAuthStateChange(_callback: (event: string, session: Session | null) => void) {
      return { data: { subscription: { unsubscribe() {} } } };
    },

    admin: {
      async createUser(params: {
        email: string;
        password?: string;
        email_confirm?: boolean;
        user_metadata?: Row;
        app_metadata?: Row;
        id?: string;
      }) {
        const denied = await requireAdmin();
        if (denied) return { data: { user: null }, error: denied };
        const { user, error } = await createUser(await getDb(), {
          ...params,
          password: params.password ?? randomBytes(18).toString('base64url'),
        });
        return { data: { user: user ? toUser(user) : null }, error };
      },
      async deleteUser(id: string) {
        const denied = await requireAdmin();
        if (denied) return { data: null, error: denied };
        const error = await deleteUser(await getDb(), id);
        return { data: error ? null : {}, error };
      },
      async getUserById(id: string) {
        const denied = await requireAdmin();
        if (denied) return { data: { user: null }, error: denied };
        const doc = await findUserById(await getDb(), id);
        return doc
          ? { data: { user: toUser(doc) }, error: null }
          : { data: { user: null }, error: authError('User not found', 404, 'user_not_found') };
      },
      async updateUserById(id: string, changes: { email?: string; password?: string; user_metadata?: Row }) {
        const denied = await requireAdmin();
        if (denied) return { data: { user: null }, error: denied };
        const { user, error } = await updateUser(await getDb(), id, changes);
        return { data: { user: user ? toUser(user) : null }, error };
      },
      async listUsers({ page = 1, perPage = 50 }: { page?: number; perPage?: number } = {}) {
        const denied = await requireAdmin();
        if (denied) return { data: { users: [] as User[] }, error: denied };
        const docs = await users(await getDb())
          .find()
          .sort({ created_at: 1 })
          .skip((page - 1) * perPage)
          .limit(perPage)
          .toArray();
        return { data: { users: docs.map(toUser) }, error: null };
      },
    },
  };

  return {
    from<T = any>(table: string) {
      return new QueryBuilder<T>(run, table);
    },
    /** Runs a query recorded by the browser client (see app/api/db). */
    execute: run,
    async rpc(fn: string, args?: Row): Promise<DbResult> {
      return executeRpc(await getDb(), fn, args, await caller());
    },
    storage: {
      from: (bucket: string) => serverBucket(getDb, bucket),
    },
    auth,
  };
}

export type DbClient = ReturnType<typeof createDbClient>;
