import { redirect } from 'next/navigation';
import { createClient } from '@/lib/db/server';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: roleData } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  type UserRole = 'admin' | 'coach' | 'athlete';
  const role: UserRole = (roleData as { role: UserRole } | null)?.role || 'athlete';

  if (role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: profile } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const name = (profile as { full_name?: string } | null)?.full_name || 'Administrator';

  return (
    <DashboardShell
      role="admin"
      user={{ name, email: user.email ?? '', subtitle: user.email ?? 'Administrator' }}
    >
      {children}
    </DashboardShell>
  );
}
