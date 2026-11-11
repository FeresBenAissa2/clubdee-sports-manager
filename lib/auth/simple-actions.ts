'use server';

import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';

export interface AuthResult {
  success: boolean;
  error?: string;
  data?: {
    role: 'admin' | 'coach' | 'athlete';
  };
}

export async function simpleSignIn(email: string, password: string): Promise<AuthResult> {
  try {
    const db = await createClient();

    // Authenticate
    const { error } = await db.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Determine role from email
    let role: 'admin' | 'coach' | 'athlete' = 'athlete';
    if (email.includes('admin')) role = 'admin';
    else if (email.includes('coach')) role = 'coach';

    return { success: true, data: { role } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

export async function simpleSignOut() {
  const db = await createClient();
  await db.auth.signOut();
  redirect('/login');
}
