import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  Megaphone,
  Plus,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { getPendingCount } from '@/lib/integration/application-integration';
import { getPrimaryCoachProfile } from '@/lib/coach/get-coach-profile';
import { StatCard } from '@/components/admin/StatCard';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import {
  ActionTile,
  SectionTitle,
  WelcomeBanner,
  bannerPrimaryAction,
  bannerSecondaryAction,
} from '@/components/dashboard/DashboardBits';

export default async function CoachDashboard() {
  const db = await createClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Coach may have multiple club rows — never use .single()/.maybeSingle() alone
  const { profile, clubIds, error: profileError } = await getPrimaryCoachProfile(
    db,
    user.id
  );

  if (!profile) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-8 text-center shadow-xl shadow-blue-900/5">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
            <AlertTriangle className="size-7" />
          </span>
          <h2 className="mt-5 text-xl font-bold text-foreground">Coach profile not found</h2>
          <p className="mt-2 text-muted-foreground">
            No coach profile is linked to this account. Please contact an administrator.
          </p>
          <div className="mt-6 space-y-1.5 rounded-2xl bg-secondary/60 p-4 text-left text-sm">
            <p>
              <span className="font-semibold">User ID:</span> {user.id}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {user.email}
            </p>
            {profileError && (
              <p className="text-rose-600">
                <span className="font-semibold">Error:</span> {profileError}
              </p>
            )}
          </div>
          <Button asChild className="mt-6 w-full">
            <Link href="/logout" prefetch={false}>
              Sign out
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const clubId = profile.clubs?.id || profile.club_id;
  // Pending apps across ALL clubs this coach coaches (not only primary)
  const allClubIds =
    clubIds && clubIds.length > 0 ? clubIds : clubId ? [clubId] : [];

  // Get statistics
  const { count: totalAthletes } = await db
    .from('athletes')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', clubId || '');

  const { count: totalSessions } = await db
    .from('training_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', clubId || '');

  const { count: totalPerformanceRecords } = await db
    .from('performance_records')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', profile.id);

  // Get pending application count for badge
  let pendingApplications = 0;
  try {
    if (allClubIds.length > 0) {
      pendingApplications = await getPendingCount(allClubIds);
    }
  } catch (error) {
    console.error('Error fetching pending applications:', error);
  }

  const initials = `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
  const clubLabel = profile.clubs?.name
    ? allClubIds.length > 1
      ? `${profile.clubs.name} + ${allClubIds.length - 1} more club${allClubIds.length > 2 ? 's' : ''}`
      : profile.clubs.name
    : 'Coach';

  return (
    <Reveal className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <WelcomeBanner
        eyebrow={clubLabel}
        title={`Welcome back, ${profile.first_name}`}
        description="Here is your coaching overview for today."
        initials={initials}
        actions={
          <>
            <Link href="/dashboard/coach/sessions" className={bannerPrimaryAction}>
              <Plus className="size-4" />
              New session
            </Link>
            <Link href="/dashboard/coach/attendance" className={bannerSecondaryAction}>
              <ClipboardCheck className="size-4" />
              Take attendance
            </Link>
          </>
        }
      />

      {pendingApplications > 0 && (
        <Link
          href="/dashboard/coach/applications"
          data-reveal
          className="group flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 transition-shadow hover:shadow-lg hover:shadow-amber-500/10 sm:p-5"
        >
          <span className="flex items-center gap-4">
            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
              <FileCheck2 className="size-5" />
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold ring-2 ring-white">
                {pendingApplications > 9 ? '9+' : pendingApplications}
              </span>
            </span>
            <span>
              <span className="block font-semibold text-amber-950">
                {pendingApplications} membership application{pendingApplications === 1 ? '' : 's'}{' '}
                waiting for you
              </span>
              <span className="block text-sm text-amber-800/80">
                Review documents and approve new athletes.
              </span>
            </span>
          </span>
          <span className="hidden items-center gap-1.5 text-sm font-semibold text-amber-900 sm:inline-flex">
            Review now
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard reveal title="Athletes" value={totalAthletes || 0} icon={Users} tone="brand" description="In your primary club" />
        <StatCard reveal title="Training sessions" value={totalSessions || 0} icon={CalendarDays} tone="violet" description="Created for your club" />
        <StatCard reveal title="Test results" value={totalPerformanceRecords || 0} icon={TrendingUp} tone="emerald" description="Recorded by you" />
        <StatCard reveal title="Pending applications" value={pendingApplications} icon={FileCheck2} tone="amber" description="Across all your clubs" />
      </div>

      <section>
        <SectionTitle title="Members" description="Applications, roster and club communication." />
        <div className="grid gap-4 md:grid-cols-3">
          <ActionTile href="/dashboard/coach/applications" icon={FileCheck2} tone="amber" title="Review applications" description="Approve or reject new members" badge={pendingApplications} />
          <ActionTile href="/dashboard/coach/athletes" icon={Users} tone="brand" title="Athlete roster" description="View and manage your athletes" />
          <ActionTile href="/dashboard/coach/announcements" icon={Megaphone} tone="rose" title="Announcements" description="Post news for your athletes" />
        </div>
      </section>

      <section>
        <SectionTitle title="Training" description="Plan sessions, track presence and compete." />
        <div className="grid gap-4 md:grid-cols-3">
          <ActionTile href="/dashboard/coach/sessions" icon={CalendarDays} tone="violet" title="Training schedule" description="Set training days and times" />
          <ActionTile href="/dashboard/coach/attendance" icon={ClipboardCheck} tone="emerald" title="Record attendance" description="Check athletes in to sessions" />
          <ActionTile href="/dashboard/coach/tournaments" icon={Trophy} tone="sky" title="Tournaments" description="Select athletes to compete" />
        </div>
      </section>

      <section>
        <SectionTitle title="Performance" description="Measure progress and share results." />
        <div className="grid gap-4 md:grid-cols-2">
          <ActionTile href="/dashboard/coach/performance" icon={Activity} tone="emerald" title="Record test results" description="Record and track development" />
          <ActionTile href="/dashboard/coach/reports" icon={BarChart3} tone="brand" title="Reports" description="Attendance and performance reports" />
        </div>
      </section>
    </Reveal>
  );
}
