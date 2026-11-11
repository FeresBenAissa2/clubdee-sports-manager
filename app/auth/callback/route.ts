import { createClient } from '@/lib/db/server';
import { NextResponse } from 'next/server';
import { getRedirectUrl } from '@/lib/auth/config';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const db = await createClient();

    // Exchange code for session
    const { data, error } = await db.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Get user role
      const { data: roleData } = await db
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      type UserRole = 'admin' | 'coach' | 'athlete';
      const role: UserRole = (roleData as { role: UserRole } | null)?.role || 'athlete';
      const redirectUrl = getRedirectUrl(role);

      return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin));
    }
  }

  // If there's an error, redirect to login
  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
}
