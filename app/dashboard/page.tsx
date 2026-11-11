import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';

/**
 * Smart Dashboard Router
 * Automatically redirects users to their role-specific dashboard
 * - Admin → /dashboard/admin
 * - Coach → /dashboard/coach
 * - Athlete → /dashboard/athlete
 */
export default async function DashboardPage() {
  const db = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get user role from user_roles table
  const userRoleResult = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  const userRole = userRoleResult.data as { role: string } | null;
  const roleError = userRoleResult.error;

  if (roleError || !userRole) {
    // If no role found, check if user has a profile
    // Note: profiles.id = auth.users.id (not user_id column)
    const profileResult = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const profile = profileResult.data as { role: string } | null;

    if (profile?.role) {
      // Redirect based on profile role
      switch (profile.role) {
        case 'admin':
          redirect('/dashboard/admin');
        case 'coach':
          redirect('/dashboard/coach');
        case 'athlete':
          redirect('/dashboard/athlete');
        default:
          redirect('/pending-approval');
      }
    }

    // No role found, redirect to pending approval
    redirect('/pending-approval');
  }

  // Redirect based on user role
  switch (userRole.role) {
    case 'admin':
      redirect('/dashboard/admin');
    case 'coach':
      redirect('/dashboard/coach');
    case 'athlete':
      redirect('/dashboard/athlete');
    default:
      redirect('/pending-approval');
  }
}
