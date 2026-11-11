import { redirect } from 'next/navigation';
import { createClient } from '@/lib/db/server';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getCoachProfilesForUser } from '@/lib/coach/get-coach-profile';
import { getPendingCount } from '@/lib/integration/application-integration';

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { profiles } = await getCoachProfilesForUser(db, user.id);
  const primary = profiles[0];
  const clubIds = profiles.map((p) => p.club_id);

  let pending = 0;
  if (clubIds.length > 0) {
    try {
      pending = await getPendingCount(clubIds);
    } catch {
      pending = 0;
    }
  }

  const name = primary ? `${primary.first_name} ${primary.last_name}`.trim() : user.email ?? 'Coach';
  const subtitle = primary?.clubs?.name
    ? clubIds.length > 1
      ? `${primary.clubs.name} +${clubIds.length - 1} more`
      : primary.clubs.name
    : 'Coach';

  return (
    <DashboardShell
      role="coach"
      user={{ name, email: user.email ?? '', subtitle }}
      badges={{ '/dashboard/coach/applications': pending }}
    >
      {children}
    </DashboardShell>
  );
}
