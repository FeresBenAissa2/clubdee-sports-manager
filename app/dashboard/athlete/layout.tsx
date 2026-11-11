import { redirect } from 'next/navigation';
import { createClient } from '@/lib/db/server';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: athlete } = await db
    .from('athletes')
    .select('first_name, last_name, clubs (name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  const row = athlete as
    | { first_name: string; last_name: string; clubs?: { name: string } | null }
    | null;
  const name = row ? `${row.first_name} ${row.last_name}`.trim() : user.email ?? 'Athlete';

  return (
    <DashboardShell
      role="athlete"
      user={{ name, email: user.email ?? '', subtitle: row?.clubs?.name ?? 'Athlete' }}
      contentClassName="px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10"
    >
      {children}
    </DashboardShell>
  );
}
