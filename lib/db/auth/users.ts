/* eslint-disable @typescript-eslint/no-explicit-any -- user metadata is free-form */
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Db } from 'mongodb';
import { cascadeDelete } from '../query/executor';
import { authError, type AuthError, type User } from '../types';

/** Stored in the `users` collection (what used to be Supabase's auth.users). */
export interface UserDoc {
  _id: string;
  id: string;
  email: string;
  password_hash: string;
  email_confirmed_at: Date | null;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  last_sign_in_at: Date | null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

export const users = (db: Db) => db.collection<UserDoc>('users');

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

export function toUser(doc: UserDoc): User {
  return {
    id: doc.id,
    email: doc.email,
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: iso(doc.email_confirmed_at),
    phone: '',
    created_at: iso(doc.created_at) as string,
    updated_at: iso(doc.updated_at) as string,
    last_sign_in_at: iso(doc.last_sign_in_at),
    user_metadata: doc.user_metadata ?? {},
    app_metadata: { provider: 'email', providers: ['email'], ...(doc.app_metadata ?? {}) },
    identities: [],
  };
}

export async function findUserById(db: Db, id: string): Promise<UserDoc | null> {
  return users(db).findOne({ _id: id });
}

export async function findUserByEmail(db: Db, email: string): Promise<UserDoc | null> {
  return users(db).findOne({ email: email.trim().toLowerCase() });
}

export async function createUser(
  db: Db,
  input: { email: string; password: string; id?: string; user_metadata?: Record<string, any>; app_metadata?: Record<string, any> }
): Promise<{ user: UserDoc | null; error: AuthError | null }> {
  const email = input.email?.trim().toLowerCase() ?? '';
  if (!EMAIL.test(email)) return { user: null, error: authError(`Email address "${input.email}" is invalid`, 400, 'email_address_invalid') };
  if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      user: null,
      error: authError(`Password should be at least ${MIN_PASSWORD_LENGTH} characters.`, 422, 'weak_password'),
    };
  }
  if (await findUserByEmail(db, email)) {
    return { user: null, error: authError('User already registered', 422, 'user_already_exists') };
  }
  const id = input.id ?? randomUUID();
  const now = new Date();
  const doc: UserDoc = {
    _id: id,
    id,
    email,
    password_hash: await bcrypt.hash(input.password, 10),
    email_confirmed_at: now,
    user_metadata: input.user_metadata ?? {},
    app_metadata: input.app_metadata ?? {},
    created_at: now,
    updated_at: now,
    last_sign_in_at: null,
  };
  try {
    await users(db).insertOne(doc);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return { user: null, error: authError('User already registered', 422, 'user_already_exists') };
    }
    throw error;
  }
  return { user: doc, error: null };
}

export async function checkPassword(db: Db, email: string, password: string): Promise<UserDoc | null> {
  const doc = await findUserByEmail(db, email ?? '');
  if (!doc || !password || !(await bcrypt.compare(password, doc.password_hash))) return null;
  const now = new Date();
  await users(db).updateOne({ _id: doc._id }, { $set: { last_sign_in_at: now } });
  return { ...doc, last_sign_in_at: now };
}

export async function updateUser(
  db: Db,
  id: string,
  changes: { email?: string; password?: string; data?: Record<string, any>; user_metadata?: Record<string, any> }
): Promise<{ user: UserDoc | null; error: AuthError | null }> {
  const doc = await findUserById(db, id);
  if (!doc) return { user: null, error: authError('User not found', 404, 'user_not_found') };
  const set: Partial<UserDoc> = { updated_at: new Date() };
  if (changes.email) {
    const email = changes.email.trim().toLowerCase();
    if (!EMAIL.test(email)) return { user: null, error: authError('Invalid email', 400, 'email_address_invalid') };
    set.email = email;
  }
  if (changes.password) {
    if (changes.password.length < MIN_PASSWORD_LENGTH) {
      return { user: null, error: authError(`Password should be at least ${MIN_PASSWORD_LENGTH} characters.`, 422, 'weak_password') };
    }
    set.password_hash = await bcrypt.hash(changes.password, 10);
  }
  const metadata = changes.data ?? changes.user_metadata;
  if (metadata) set.user_metadata = { ...doc.user_metadata, ...metadata };
  await users(db).updateOne({ _id: id }, { $set: set });
  return { user: { ...doc, ...set } as UserDoc, error: null };
}

/** Removes the account and everything that referenced auth.users with ON DELETE CASCADE. */
export async function deleteUser(db: Db, id: string): Promise<AuthError | null> {
  const doc = await findUserById(db, id);
  if (!doc) return authError('User not found', 404, 'user_not_found');
  await cascadeDelete(db, 'users', [{ id }]);
  await users(db).deleteOne({ _id: id });
  return null;
}
