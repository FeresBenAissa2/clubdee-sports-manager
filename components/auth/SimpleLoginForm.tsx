'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import { signIn } from '@/lib/auth/actions';
import { getDeviceInfo } from '@/lib/utils/device-fingerprint';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TEST_USERS = {
  admin: { email: 'demo.admin@clubdee.com', password: 'Demo123456!' },
  coach: { email: 'demo.coach@clubdee.com', password: 'Demo123456!' },
  athlete: { email: 'demo.athlete@clubdee.com', password: 'Demo123456!' },
};

const DEMO_ROLES = [
  { key: 'admin', label: 'Admin', icon: ShieldCheck },
  { key: 'coach', label: 'Coach', icon: Trophy },
  { key: 'athlete', label: 'Athlete', icon: UserRound },
] as const;

const STORAGE_KEY = 'sports_club_login';

const inputClass =
  'h-12 w-full rounded-xl border border-input bg-card pl-11 text-[15px] text-foreground shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground/70 hover:border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60';

export function SimpleLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTestCredentials, setShowTestCredentials] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
        setEmail(savedEmail || '');
        setPassword(savedPassword || '');
        setRememberMe(true);
      }
    } catch (err) {
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
      console.warn('Cleared corrupted login data from localStorage');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get device information for tracking
      const deviceInfo = getDeviceInfo();

      const result = await signIn(email, password, deviceInfo);

      if (!result.success) {
        setError(result.error || 'Incorrect email or password');
        setLoading(false);
        return;
      }

      // Save or clear credentials based on rememberMe
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }

      // Redirect to /dashboard - middleware will handle role-based routing
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const fillCredentials = (type: keyof typeof TEST_USERS) => {
    setEmail(TEST_USERS[type].email);
    setPassword(TEST_USERS[type].password);
    setError('');
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <span className="size-1.5 rounded-full bg-blue-500" />
          Member area
        </p>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Welcome back</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Athletes, coaches and staff: sign in to see your schedule, results and club news.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" aria-label="Sign in form">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(inputClass, 'pr-4')}
              placeholder="you@club.com"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(inputClass, 'pr-12')}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              disabled={loading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        </div>

        <label htmlFor="remember" className="flex w-fit cursor-pointer items-center gap-2.5 select-none">
          <input
            id="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-4 rounded border-input accent-blue-600"
            disabled={loading}
          />
          <span className="text-sm text-muted-foreground">Remember me</span>
        </label>

        <div
          className={cn(
            'grid transition-all duration-300 ease-out',
            error ? 'grid-rows-[1fr] opacity-100' : '!mt-0 grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="overflow-hidden">
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="animate-shake rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {error}
              </div>
            )}
          </div>
        </div>

        <Button type="submit" variant="gradient" size="xl" disabled={loading} className="group w-full">
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>

      <div className="my-8 flex items-center gap-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        Not a member yet?
        <span className="h-px flex-1 bg-border" />
      </div>

      <Link
        href="/register-membership"
        className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:border-blue-200 hover:shadow-md hover:shadow-blue-600/5"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <UserRound className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">
              Join ClubDee
            </span>
            <span className="block text-xs text-muted-foreground">
              Apply for membership in a few minutes
            </span>
          </span>
        </span>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
      </Link>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Are you a parent?{' '}
        <Link
          href="/parent/login"
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          <Users className="size-3.5" />
          Parent sign in
        </Link>
      </p>

      {/* Test credentials - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-secondary/40 p-4">
          <button
            type="button"
            onClick={() => setShowTestCredentials(!showTestCredentials)}
            className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            aria-expanded={showTestCredentials}
          >
            Demo accounts
            <ChevronDown
              className={cn('size-4 transition-transform duration-200', showTestCredentials && 'rotate-180')}
            />
          </button>
          <div
            className={cn(
              'grid transition-all duration-300 ease-out',
              showTestCredentials ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            )}
            inert={!showTestCredentials}
          >
            <div className="overflow-hidden">
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ROLES.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => fillCredentials(key)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-xs font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow-sm active:translate-y-0"
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
