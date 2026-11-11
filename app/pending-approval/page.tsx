import { redirect } from 'next/navigation';
import { createClient } from '@/lib/db/server';
import { getAthleteAccessStatus } from '@/lib/auth/access-control';
import { AlertCircle, Clock, Sparkles, XCircle, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandScreen } from '@/components/layout/BrandScreen';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * Pending Approval Page
 * 
 * Validates: Requirements AC5, AC6
 * - AC5: Rejection Handling - Show rejection reason and allow reapplication
 * - AC6: Pending State Restrictions - Show pending status and prevent access
 * 
 * This page is shown to athletes who don't have active membership status.
 * It displays different content based on membership_status:
 * - pending: Show waiting message with application details
 * - rejected: Show rejection reason and reapply button
 * - suspended: Show suspension message
 * - null: Show registration prompt
 */
export default async function PendingApprovalPage() {
  const db = await createClient();

  // Get current user
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get detailed access status
  const accessStatus = await getAthleteAccessStatus(user.id);

  // If user has access (active membership), redirect to dashboard
  if (accessStatus.hasAccess) {
    redirect('/dashboard/athlete');
  }

  // Get user role to check if they're an athlete
  const { data: userRoleData } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const userRole = (userRoleData as any)?.role || 'athlete';

  // Non-athletes shouldn't see this page
  if (userRole !== 'athlete') {
    redirect('/dashboard');
  }

  const status = accessStatus.membershipStatus;

  return (
    <BrandScreen
      className="flex justify-center px-4 pt-6 pb-16 sm:pt-12"
      aside={
        <Link
          href="/logout"
          prefetch={false}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Sign out
        </Link>
      }
    >
      <div className="w-full max-w-xl rounded-3xl border border-border/80 bg-card p-7 shadow-xl shadow-blue-900/5 sm:p-10">
        {status === 'pending' && (
          <>
            <StatusHeader
              icon={Clock}
              tone="amber"
              pulse
              title="Your application is under review"
              description="A coach is reviewing your information and documents."
              clubName={accessStatus.clubName}
            />
            <Steps
              items={[
                { label: 'Application submitted', done: true },
                { label: 'Coach reviews your information and documents', current: true },
                { label: 'Membership activated — full access to your dashboard' },
              ]}
            />
            <Actions>
              <Button asChild size="lg">
                <Link href="/dashboard/athlete/applications">View application status</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/logout" prefetch={false}>Sign out</Link>
              </Button>
            </Actions>
          </>
        )}

        {status === 'rejected' && (
          <>
            <StatusHeader
              icon={XCircle}
              tone="rose"
              title="Application not approved"
              description="Your application was not approved this time."
              clubName={accessStatus.clubName}
            />
            {accessStatus.rejectionReason && (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-900">Reason given by the coach</p>
                <p className="mt-1 text-sm text-rose-800">{accessStatus.rejectionReason}</p>
              </div>
            )}
            <div className="mt-4 rounded-2xl border border-border bg-secondary/50 p-4">
              <p className="text-sm font-semibold text-foreground">Want to apply again?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You can update your information and reapply, or choose another sport.
              </p>
            </div>
            <Actions>
              <Button asChild size="lg">
                <Link href="/register-membership">Apply again</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard/athlete/applications">Application history</Link>
              </Button>
            </Actions>
          </>
        )}

        {status === 'suspended' && (
          <>
            <StatusHeader
              icon={AlertCircle}
              tone="orange"
              title="Account suspended"
              description="Your account has been temporarily suspended."
            />
            <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm font-semibold text-orange-900">Contact an administrator</p>
              <p className="mt-1 text-sm text-orange-800">
                Please contact your coach or an administrator for more information.
              </p>
            </div>
          </>
        )}

        {!status && (
          <>
            <StatusHeader
              icon={Sparkles}
              tone="brand"
              title="Welcome to ClubDee"
              description="Apply for membership to unlock your member area."
            />
            <Steps
              items={[
                { label: 'Choose the sport you want to train in', current: true },
                { label: 'Fill in your personal information' },
                { label: 'Wait for approval from your coach' },
                { label: 'Start training as soon as you are approved' },
              ]}
            />
            <Actions>
              <Button asChild size="lg" variant="gradient">
                <Link href="/register-membership">Apply for membership</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/logout" prefetch={false}>Sign out</Link>
              </Button>
            </Actions>
          </>
        )}
      </div>
    </BrandScreen>
  );
}

const TONE_STYLES = {
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  orange: 'bg-orange-50 text-orange-600 ring-orange-100',
  brand: 'bg-blue-50 text-blue-600 ring-blue-100',
} as const;

function StatusHeader({
  icon: Icon,
  tone,
  title,
  description,
  clubName,
  pulse = false,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONE_STYLES;
  title: string;
  description: string;
  clubName?: string | null;
  pulse?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="relative mx-auto size-16">
        {pulse && <span className="absolute inset-0 animate-ping rounded-2xl bg-amber-200/60" />}
        <span
          className={cn(
            'relative flex size-16 items-center justify-center rounded-2xl ring-1 ring-inset',
            TONE_STYLES[tone]
          )}
        >
          <Icon className="size-8" />
        </span>
      </div>
      <h1 className="mt-6 text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
      {clubName && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Team</span>
          <Badge variant="brand">{clubName}</Badge>
        </div>
      )}
    </div>
  );
}

function Steps({ items }: { items: { label: string; done?: boolean; current?: boolean }[] }) {
  return (
    <ol className="mt-8 space-y-3">
      {items.map((item, i) => (
        <li
          key={item.label}
          className={cn(
            'flex items-center gap-3 rounded-2xl border p-3.5 text-sm',
            item.current
              ? 'border-blue-200 bg-blue-50/70 text-blue-900'
              : 'border-border bg-card text-muted-foreground'
          )}
        >
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
              item.done
                ? 'bg-emerald-500 text-white'
                : item.current
                  ? 'bg-blue-600 text-white'
                  : 'bg-secondary text-muted-foreground'
            )}
          >
            {item.done ? '✓' : i + 1}
          </span>
          <span className={cn(item.current && 'font-medium')}>{item.label}</span>
        </li>
      ))}
    </ol>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">{children}</div>;
}
