'use client';

import { useEffect } from 'react';
import { simpleSignOut } from '@/lib/auth/simple-actions';
import { LogoMark } from '@/components/brand/Logo';

export default function LogoutPage() {
  useEffect(() => {
    simpleSignOut();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-radial">
      <div className="text-center text-white">
        <div className="relative mx-auto size-16">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-blue-500/30" />
          <LogoMark className="relative size-16 rounded-2xl" />
        </div>
        <p className="mt-6 font-display text-xl font-semibold">Signing you out…</p>
        <p className="mt-1 text-sm text-white/55">See you at the next session.</p>
      </div>
    </div>
  );
}
