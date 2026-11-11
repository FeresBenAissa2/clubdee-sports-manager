'use client';

/**
 * Membership registration:
 * - New visitors: account → personal info → sport
 * - Logged-in athletes without active membership: continue from personal info
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/db/client';
import { BrandScreen } from '@/components/layout/BrandScreen';
import RegistrationForm from '@/components/membership/RegistrationForm';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const REGISTRATION_FLAG = 'clubdee_registration_in_progress';

export default function RegisterMembershipPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  const [existingEmail, setExistingEmail] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const db = createClient();
    const {
      data: { user },
    } = await db.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await db
      .from('profiles')
      .select('membership_status')
      .eq('id', user.id)
      .maybeSingle();

    const status = (profile as { membership_status?: string | null } | null)?.membership_status;

    if (status === 'active') {
      router.replace('/dashboard/athlete');
      return;
    }

    if (status === 'pending') {
      router.replace('/pending-approval');
      return;
    }

    sessionStorage.setItem(REGISTRATION_FLAG, '1');
    setExistingUserId(user.id);
    setExistingEmail(user.email ?? '');
    setLoading(false);
  }

  function handleSuccess() {
    sessionStorage.removeItem(REGISTRATION_FLAG);
    addToast({
      title: 'Application submitted',
      description: 'Your membership application was sent. A coach will review it soon.',
      variant: 'success',
    });
    router.push('/pending-approval');
  }

  if (loading) {
    return (
      <BrandScreen className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-10 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </BrandScreen>
    );
  }

  return (
    <BrandScreen
      className="px-4 pt-4 pb-16 sm:px-6 lg:px-8"
      aside={
        existingUserId ? (
          <Link
            href="/logout"
            prefetch={false}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Sign out
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">
            Already a member?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        )
      }
    >
      <div className="mx-auto mb-8 max-w-4xl text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-blue-600 uppercase">
          Membership application
        </p>
        <h1 className="mt-3 font-athletic text-5xl leading-[0.95] font-extrabold uppercase italic text-foreground sm:text-7xl">
          Join ClubDee
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted-foreground">
          Create your account, tell us about yourself and choose your sport. The coach of your
          sport will review your application.
        </p>
      </div>
      {existingUserId ? (
        <div className="mx-auto mb-5 max-w-4xl rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900">
          You are signed in as <strong>{existingEmail}</strong>. Complete your membership
          application below (account step skipped).
        </div>
      ) : null}
      <RegistrationForm
        onSuccess={handleSuccess}
        initialUserId={existingUserId ?? undefined}
        initialEmail={existingEmail || undefined}
        startStep={existingUserId ? 2 : 1}
        onAccountCreated={() => {
          sessionStorage.setItem(REGISTRATION_FLAG, '1');
        }}
      />
    </BrandScreen>
  );
}
