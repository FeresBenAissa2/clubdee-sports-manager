import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  Settings,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { Reveal } from '@/components/motion/Reveal';
import {
  ActionTile,
  SectionTitle,
  WelcomeBanner,
  bannerPrimaryAction,
  bannerSecondaryAction,
} from '@/components/dashboard/DashboardBits';

export default async function AdminDashboard() {
  const db = await createClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get statistics
  const { count: totalAthletes } = await db
    .from('athletes')
    .select('*', { count: 'exact', head: true });

  const { count: totalCoaches } = await db
    .from('coaches')
    .select('*', { count: 'exact', head: true });

  const { count: totalClubs } = await db
    .from('clubs')
    .select('*', { count: 'exact', head: true });

  const { count: totalSessions } = await db
    .from('training_sessions')
    .select('*', { count: 'exact', head: true });

  const { count: pendingApplications } = await db
    .from('membership_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const stats = {
    totalClubs: totalClubs || 0,
    totalAthletes: totalAthletes || 0,
    totalCoaches: totalCoaches || 0,
    totalSessions: totalSessions || 0,
    pending: pendingApplications || 0,
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Reveal className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <WelcomeBanner
        eyebrow={`Club office · ${today}`}
        title="The club at a glance"
        description="Sports, coaches, athletes and training across ClubDee."
        actions={
          <>
            <Link href="/dashboard/admin/create-user" className={bannerPrimaryAction}>
              <UserPlus className="size-4" />
              Create user
            </Link>
            <Link href="/dashboard/admin/reports" className={bannerSecondaryAction}>
              <BarChart3 className="size-4" />
              Reports
            </Link>
          </>
        }
      >
        {stats.pending > 0 && (
          <Link
            href="/dashboard/admin/applications"
            className="group inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-300/20"
          >
            <span className="size-1.5 rounded-full bg-amber-300" />
            {stats.pending} membership application{stats.pending === 1 ? '' : 's'} waiting for
            review
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </WelcomeBanner>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard reveal title="Clubs" value={stats.totalClubs} icon={Building2} tone="brand" description="Active sports clubs" />
        <StatCard reveal title="Coaches" value={stats.totalCoaches} icon={UserCog} tone="violet" description="Coach-club assignments" />
        <StatCard reveal title="Athletes" value={stats.totalAthletes} icon={Users} tone="emerald" description="Registered athletes" />
        <StatCard reveal title="Training sessions" value={stats.totalSessions} icon={CalendarDays} tone="amber" description="Scheduled across all clubs" />
      </div>

      <section>
        <SectionTitle title="Quick actions" description="Jump straight into the most common tasks." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ActionTile href="/dashboard/admin/applications" icon={FileCheck2} tone="amber" title="Membership applications" description="Review applications from every club" badge={stats.pending} />
          <ActionTile href="/dashboard/admin/create-user" icon={UserPlus} tone="brand" title="Create user account" description="Add an admin, coach or athlete" />
          <ActionTile href="/dashboard/admin/clubs" icon={Building2} tone="sky" title="Manage clubs" description="Create and edit sports clubs" />
          <ActionTile href="/dashboard/admin/coaches" icon={UserCog} tone="violet" title="Manage coaches" description="Assign coaches to clubs" />
          <ActionTile href="/dashboard/admin/athletes" icon={Users} tone="emerald" title="Manage athletes" description="Browse every registered athlete" />
          <ActionTile href="/dashboard/admin/sessions" icon={CalendarDays} tone="brand" title="Training sessions" description="All sessions across clubs" />
          <ActionTile href="/dashboard/admin/attendance" icon={ClipboardCheck} tone="emerald" title="Attendance overview" description="Attendance rates by club" />
          <ActionTile href="/dashboard/admin/reports" icon={BarChart3} tone="rose" title="System reports" description="Generate system-wide reports" />
          <ActionTile href="/dashboard/admin/settings" icon={Settings} tone="sky" title="Settings" description="Club configuration" />
        </div>
      </section>
    </Reveal>
  );
}
