import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Clock,
  FileText,
  TrendingUp,
  Award,
  Users,
  Activity,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { RecommendationCard } from '@/components/athlete/RecommendationCard';
import { GoalsWidget } from '@/components/athlete/GoalsWidget';
import { AnnouncementPriorityBadge } from '@/components/athlete/UnreadAnnouncementBadge';
import { getTodaySessions, getTomorrowSessions } from '@/lib/integration/session-integration';
import { checkImprovement } from '@/lib/integration/performance-integration';
import { StatCard } from '@/components/admin/StatCard';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import {
  SectionTitle,
  WelcomeBanner,
  bannerPrimaryAction,
  bannerSecondaryAction,
} from '@/components/dashboard/DashboardBits';
import { cn } from '@/lib/utils';

interface AthleteProfile {
  id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  profile_picture_url?: string;
  clubs?: {
    id: string;
    name: string;
  };
}

interface AttendanceLog {
  id: string;
  session_date: string;
  status: string;
  training_sessions?: {
    session_name: string;
    session_type: string;
  };
}

interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  announcement_reads?: { user_id: string }[] | null;
}

interface PerformanceRecord {
  id: string;
  test_date: string;
  test_type: string;
  result_value: number;
  result_unit: string;
  notes?: string;
}

export default async function AthleteDashboard() {
  const db = await createClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get athlete profile
  const { data: profile, error: profileError } = (await db
    .from('athletes')
    .select(
      `
      *,
      clubs (id, name)
    `
    )
    .eq('user_id', user.id)
    .single()) as { data: AthleteProfile | null; error: any };

  if (!profile) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-8 text-center shadow-xl shadow-blue-900/5">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
            <AlertTriangle className="size-7" />
          </span>
          <h2 className="mt-5 text-xl font-bold text-foreground">Athlete profile not found</h2>
          <p className="mt-2 text-muted-foreground">
            No athlete profile is linked to this account. Please contact an administrator.
          </p>
          <div className="mt-6 space-y-1.5 rounded-2xl bg-secondary/60 p-4 text-left text-sm">
            <p><span className="font-semibold">User ID:</span> {user.id}</p>
            <p><span className="font-semibold">Email:</span> {user.email}</p>
            {profileError && (
              <p className="text-rose-600">
                <span className="font-semibold">Error:</span> {profileError.message}
              </p>
            )}
          </div>
          <div className="mt-6 grid gap-2">
            <Button asChild>
              <Link href="/dashboard/athlete/applications">View my applications</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/logout" prefetch={false}>Sign out</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate date ranges
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get statistics with error handling
  const { count: totalAttendance, error: totalAttError } = await db
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', profile.id)
    .eq('status', 'present');

  const { count: monthlyAttendance, error: monthlyAttError } = await db
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', profile.id)
    .eq('status', 'present')
    .gte('session_date', startOfMonth.toISOString());

  const { count: totalPerformance, error: perfError } = await db
    .from('performance_records')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', profile.id);

  // Get recent attendance (last 5)
  const { data: recentAttendance, error: recentAttError } = (await db
    .from('attendance')
    .select(
      `
      *,
      training_sessions (
        session_name,
        session_type
      )
    `
    )
    .eq('athlete_id', profile.id)
    .order('session_date', { ascending: false })
    .limit(5)) as { data: AttendanceLog[] | null; error: any };

  // Get recent performance records (last 5)
  const { data: recentPerformance, error: recentPerfError } = (await db
    .from('performance_records')
    .select('*')
    .eq('athlete_id', profile.id)
    .order('test_date', { ascending: false })
    .limit(5)) as { data: PerformanceRecord[] | null; error: any };

  // Get athlete goals
  const { data: goals } = await db
    .from('athlete_goals')
    .select(`
      *,
      coaches (
        first_name,
        last_name
      )
    `)
    .eq('athlete_id', profile.id)
    .order('created_at', { ascending: false });

  // Get announcements from club coaches (only if club exists)
  let announcements = null;
  if (profile.clubs?.id) {
    // First, get all coaches from the athlete's club
    const { data: clubCoaches } = await db
      .from('coaches')
      .select('id')
      .eq('club_id', profile.clubs.id) as { data: { id: string }[] | null };

    const coachIds = clubCoaches?.map(c => c.id) || [];

    // Get announcements from club coaches
    if (coachIds.length > 0) {
      const { data, error: annError } = await db
        .from('announcements')
        .select(`
          *,
          announcement_reads!left(user_id)
        `)
        .in('coach_id', coachIds)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);
      
      announcements = data;
    }
  }

  // Get upcoming sessions count (only if club exists)
  let upcomingSessionsCount = 0;
  if (profile.clubs?.id) {
    const { count, error: sessError } = await db
      .from('training_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', profile.clubs.id)
      .gte('session_date', today.toISOString());
    
    upcomingSessionsCount = count || 0;
  }

  // Get training assignments for this athlete
  const { data: assignmentsData } = await db
    .from('training_assignments')
    .select(`
      *,
      coaches (
        first_name,
        last_name
      )
    `)
    .eq('athlete_id', profile.id)
    .order('created_at', { ascending: false });

  const assignments = (assignmentsData || []) as Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string;
    [key: string]: unknown;
  }>;

  const pendingAssignments = assignments.filter(a => 
    ['pending', 'in_progress', 'overdue'].includes(a.status)
  );

  // Generate smart recommendations
  const recommendations = [];

  // Priority 1: No club membership
  if (!profile.clubs?.id) {
    recommendations.push({
      id: 'join-club',
      title: 'Join a club to get started',
      description: 'You are not a club member yet. Register to access all features.',
      action: 'Join a club',
      href: '/dashboard/athlete/applications',
      priority: 'high' as const,
      icon: <Users className="w-5 h-5 text-red-600" />,
    });
  }

  // Priority 2: Pending training assignments
  if (pendingAssignments.length > 0) {
    const urgentAssignments = pendingAssignments.filter(a => 
      a.priority === 'urgent' || a.priority === 'high'
    );
    
    recommendations.push({
      id: 'pending-assignments',
      title: `You have ${pendingAssignments.length} training assignment(s)`,
      description: urgentAssignments.length > 0 
        ? `You have ${urgentAssignments.length} urgent assignment(s) — complete them soon`
        : 'Your coach assigned training work — review and update your progress.',
      action: 'View assignments',
      href: '/dashboard/athlete/assignments',
      priority: urgentAssignments.length > 0 ? 'high' as const : 'medium' as const,
      icon: <FileText className="w-5 h-5 text-blue-600" />,
    });
  }

  // Priority 3: Unread announcements
  if (announcements && announcements.length > 0) {
    const unreadCount = announcements.filter(
      (ann: any) => !ann.announcement_reads?.some((read: any) => read.user_id === user.id)
    ).length;
    
    if (unreadCount > 0) {
      recommendations.push({
        id: 'unread-announcements',
        title: `You have ${unreadCount} new announcement(s)`,
        description: 'Your coach posted important information — read so you do not miss updates.',
        action: 'Read announcements',
        href: '/dashboard/athlete/announcements',
        priority: 'high' as const,
        icon: <Bell className="w-5 h-5 text-red-600" />,
      });
    }
  }

  // Priority 3: Today's sessions - Using Session Integration Module
  // **Validates: Requirements 2.2** - Today session recommendation
  if (profile.clubs?.id) {
    try {
      const todaySessions = await getTodaySessions(profile.clubs.id);

      if (todaySessions && todaySessions.length > 0) {
        recommendations.push({
          id: 'today-session',
          title: 'Training today',
          description: `${todaySessions[0].title} - remember to check in on time`,
          action: 'View details',
          href: '/dashboard/athlete/schedule',
          priority: 'high' as const,
          icon: <CalendarDays className="w-5 h-5 text-red-600" />,
        });
      }
    } catch (error) {
      console.error('[AthleteDashboard] Error fetching today sessions:', error);
    }
  }

  // Priority 4: Tomorrow's sessions - Using Session Integration Module
  // **Validates: Requirements 2.2** - Tomorrow session recommendation
  if (profile.clubs?.id) {
    try {
      const tomorrowSessions = await getTomorrowSessions(profile.clubs.id);

      if (tomorrowSessions && tomorrowSessions.length > 0) {
        recommendations.push({
          id: 'tomorrow-session',
          title: 'Prepare for tomorrow',
          description: `${tomorrowSessions[0].title} — prepare your gear and get enough rest`,
          action: 'View training schedule',
          href: '/dashboard/athlete/schedule',
          priority: 'medium' as const,
          icon: <CalendarDays className="w-5 h-5 text-yellow-600" />,
        });
      }
    } catch (error) {
      console.error('[AthleteDashboard] Error fetching tomorrow sessions:', error);
    }
  }

  // Priority 5: Low attendance this month
  if (profile.clubs?.id && (monthlyAttendance || 0) < 4 && (monthlyAttendance || 0) > 0) {
    recommendations.push({
      id: 'low-attendance',
      title: 'Improve training consistency',
      description: `You attended only ${monthlyAttendance || 0} time(s) this month. Try to attend regularly to improve your skills.`,
      action: 'View training schedule',
      href: '/dashboard/athlete/schedule',
      priority: 'medium' as const,
      icon: <Activity className="w-5 h-5 text-yellow-600" />,
    });
  }

  // Priority 6: Great attendance streak
  if (profile.clubs?.id && (monthlyAttendance || 0) >= 8) {
    recommendations.push({
      id: 'great-attendance',
      title: 'Great job! You are highly consistent',
      description: `You attended ${monthlyAttendance} time(s) this month. Keep it up!`,
      action: 'View statistics',
      href: '/dashboard/athlete/attendance',
      priority: 'low' as const,
      icon: <Award className="w-5 h-5 text-blue-600" />,
    });
  }

  // Priority 7: No performance records
  if (profile.clubs?.id && (totalPerformance || 0) === 0) {
    recommendations.push({
      id: 'no-performance',
      title: 'No test results yet',
      description: 'Track your test results to see progress and improve',
      action: 'View test results',
      href: '/dashboard/athlete/performance',
      priority: 'low' as const,
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
    });
  }

  // Priority 8: Recent performance improvement - Using Performance Integration Module
  // **Validates: Requirements 4.2** - Performance improvement detection
  if (profile.clubs?.id) {
    try {
      const improvement = await checkImprovement(profile.id);
      
      if (improvement && improvement.hasImproved) {
        recommendations.push({
          id: 'performance-improved',
          title: 'Your test results improved!',
          description: `Your ${improvement.testType} improved by ${improvement.improvementPercentage.toFixed(1)}%. Well done!`,
          action: 'View details',
          href: '/dashboard/athlete/performance',
          priority: 'low' as const,
          icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
        });
      }
    } catch (error) {
      console.error('[AthleteDashboard] Error checking performance improvement:', error);
    }
  }

  // Priority 9: Check activities
  if (profile.clubs?.id && upcomingSessionsCount === 0) {
    recommendations.push({
      id: 'check-activities',
      title: 'Check new activities',
      description: 'View upcoming activities and training to plan attendance',
      action: 'View activities',
      href: '/dashboard/athlete/activities',
      priority: 'low' as const,
      icon: <FileText className="w-5 h-5 text-blue-600" />,
    });
  }

  // Priority 10: Profile completion
  if (!profile.nickname || !profile.profile_picture_url) {
    recommendations.push({
      id: 'complete-profile',
      title: 'Complete your profile',
      description: 'Add a profile photo and nickname so coaches and teammates know you better',
      action: 'Edit profile',
      href: '/dashboard/athlete/profile/edit',
      priority: 'low' as const,
      icon: <Users className="w-5 h-5 text-blue-600" />,
    });
  }

  // Priority 11: Long time no activity
  if (recentAttendance && recentAttendance.length > 0) {
    const lastAttendance = new Date(recentAttendance[0].session_date);
    const daysSinceLastAttendance = Math.floor((today.getTime() - lastAttendance.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastAttendance > 7 && profile.clubs?.id) {
      recommendations.push({
        id: 'long-absence',
        title: 'We miss you!',
        description: `You have not attended for ${daysSinceLastAttendance} day(s). Come back and train with us!`,
        action: 'View training schedule',
        href: '/dashboard/athlete/schedule',
        priority: 'medium' as const,
        icon: <Activity className="w-5 h-5 text-yellow-600" />,
      });
    }
  }

  // Sort by priority and limit to top 3
  const sortedRecommendations = recommendations
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);

  const announcementRows = (announcements || []) as AnnouncementRow[];
  const isUnread = (ann: AnnouncementRow) =>
    !ann.announcement_reads?.some((read) => read.user_id === user.id);
  const unreadAnnouncements = announcementRows.filter(isUnread).length;
  const initials = `${profile.first_name.charAt(0)}${profile.last_name?.charAt(0) ?? ''}`.toUpperCase();

  const quickLinks: { href: string; label: string; icon: LucideIcon; badge?: number }[] = [
    { href: '/dashboard/athlete/announcements', label: 'Announcements', icon: Bell, badge: unreadAnnouncements },
    { href: '/dashboard/athlete/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/dashboard/athlete/attendance', label: 'Attendance', icon: ClipboardCheck },
    { href: '/dashboard/athlete/performance', label: 'Test results', icon: TrendingUp },
    { href: '/dashboard/athlete/profile', label: 'Profile', icon: UserRound },
  ];

  return (
    <Reveal className="mx-auto max-w-6xl space-y-8">
      {!profile.clubs?.id && (
        <div
          data-reveal
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <AlertTriangle className="size-5" />
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-950">You have not joined a club yet</h3>
            <p className="mt-0.5 text-sm text-amber-800">
              Please register and join a club to access all features.
            </p>
            <Link
              href="/dashboard/athlete/applications"
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-900 hover:underline"
            >
              View my applications
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}

      <WelcomeBanner
        eyebrow={profile.clubs?.name || 'Not in a club yet'}
        title={`Hi, ${profile.nickname || profile.first_name}`}
        description="Ready for your next session? Here is your training at a glance."
        initials={initials}
        actions={
          <>
            <Link href="/dashboard/athlete/schedule" className={bannerPrimaryAction}>
              <CalendarDays className="size-4" />
              My schedule
            </Link>
            <Link href="/dashboard/athlete/performance" className={bannerSecondaryAction}>
              <TrendingUp className="size-4" />
              My results
            </Link>
          </>
        }
      >
        {upcomingSessionsCount > 0 && (
          <Link
            href="/dashboard/athlete/schedule"
            className="group inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1.5 text-sm font-medium text-lime-100 transition-colors hover:bg-lime-300/20"
          >
            <span className="size-1.5 rounded-full bg-lime-300" />
            {upcomingSessionsCount} upcoming training session{upcomingSessionsCount === 1 ? '' : 's'}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </WelcomeBanner>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard reveal title="Sessions attended" value={totalAttendance || 0} icon={CalendarDays} tone="brand" />
        <StatCard reveal title="This month" value={monthlyAttendance || 0} icon={Clock} tone="violet" />
        <StatCard reveal title="Test results" value={totalPerformance || 0} icon={TrendingUp} tone="emerald" />
        <StatCard reveal title="Upcoming sessions" value={upcomingSessionsCount} icon={Award} tone="amber" />
      </div>

      <section>
        <SectionTitle title="Quick access" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              data-reveal
              className="group relative flex flex-col items-center gap-2.5 rounded-2xl border border-border/80 bg-card px-2 py-4 text-center shadow-soft transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/5"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-transform duration-300 group-hover:scale-110">
                <q.icon className="size-5" />
              </span>
              <span className="text-xs font-medium text-foreground sm:text-sm">{q.label}</span>
              {(q.badge ?? 0) > 0 && (
                <span className="absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                  {q.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {sortedRecommendations.length > 0 && (
        <div data-reveal>
          <RecommendationCard recommendations={sortedRecommendations} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section data-reveal className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">Announcements</h2>
                {unreadAnnouncements > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {unreadAnnouncements} new
                  </span>
                )}
              </div>
              <Link
                href="/dashboard/athlete/announcements"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {announcementRows.length > 0 ? (
              <ul className="space-y-2">
                {announcementRows.slice(0, 3).map((announcement) => {
                  const unread = isUnread(announcement);
                  return (
                    <li key={announcement.id}>
                      <Link
                        href="/dashboard/athlete/announcements"
                        className={cn(
                          'flex items-start gap-3 rounded-xl border p-3.5 transition-colors',
                          unread
                            ? 'border-blue-100 bg-blue-50/50 hover:bg-blue-50'
                            : 'border-transparent hover:bg-secondary/60'
                        )}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white">
                          <Bell className="size-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            {unread && <span className="size-2 shrink-0 rounded-full bg-rose-500" />}
                            <span className="line-clamp-1 flex-1 text-sm font-semibold text-foreground">
                              {announcement.title}
                            </span>
                            <AnnouncementPriorityBadge priority={announcement.priority} />
                          </span>
                          <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                            {announcement.message}
                          </span>
                          <span className="mt-1.5 block text-xs text-muted-foreground/80">
                            {new Date(announcement.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl bg-secondary/50 px-4 py-8 text-center text-sm text-muted-foreground">
                No announcements from your coach yet.
              </p>
            )}
          </section>

          {pendingAssignments.length > 0 && (
            <section data-reveal className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Training assignments</h2>
                <Link
                  href="/dashboard/athlete/assignments"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
              <div className="space-y-2">
                {pendingAssignments.slice(0, 3).map((assignment) => (
                  <Link
                    key={assignment.id}
                    href="/dashboard/athlete/assignments"
                    className={cn(
                      'flex items-start justify-between gap-3 rounded-xl border-l-4 p-3.5',
                      assignment.priority === 'urgent'
                        ? 'border-l-rose-500 bg-rose-50'
                        : assignment.priority === 'high'
                          ? 'border-l-orange-400 bg-orange-50'
                          : 'border-l-blue-400 bg-blue-50'
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium text-foreground">{assignment.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Due:{' '}
                        {new Date(assignment.due_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-medium',
                        assignment.status === 'overdue'
                          ? 'bg-rose-100 text-rose-700'
                          : assignment.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-secondary text-secondary-foreground'
                      )}
                    >
                      {assignment.status === 'overdue'
                        ? 'Overdue'
                        : assignment.status === 'in_progress'
                          ? 'In progress'
                          : 'To do'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section data-reveal className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent sessions</h2>
              <Link
                href="/dashboard/athlete/attendance"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                History
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {recentAttendance && recentAttendance.length > 0 ? (
              <ol className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-px before:bg-border">
                {recentAttendance.slice(0, 4).map((attendance) => {
                  const present = attendance.status === 'present';
                  return (
                    <li key={attendance.id} className="relative flex items-center gap-3 rounded-xl py-2 pr-1">
                      <span
                        className={cn(
                          'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full ring-4 ring-card',
                          present ? 'bg-emerald-500' : 'bg-gray-300'
                        )}
                      >
                        <span className="size-2 rounded-full bg-white" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {attendance.training_sessions?.session_name || 'Training'}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {new Date(attendance.session_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          present ? 'bg-emerald-50 text-emerald-700' : 'bg-secondary text-muted-foreground'
                        )}
                      >
                        {present ? 'Present' : 'Absent'}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="rounded-xl bg-secondary/50 px-4 py-8 text-center text-sm text-muted-foreground">
                Your attendance will appear here after your first session.
              </p>
            )}
          </section>

          {goals && goals.length > 0 && (
            <div data-reveal>
              <GoalsWidget goals={goals} />
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}
