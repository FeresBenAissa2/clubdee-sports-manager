'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signIn } from '@/lib/auth/actions';
import { validateEmail } from '@/lib/auth/validation';
import { getRedirectUrl } from '@/lib/auth/config';
import { getDeviceInfo } from '@/lib/utils/device-fingerprint';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, TestTube } from 'lucide-react';

// Test credentials for quick testing
const TEST_CREDENTIALS = {
  admin: { email: 'admin@test.com', password: 'Admin123!', label: '👨‍💼 Admin' },
  coach: { email: 'coach@test.com', password: 'Coach123!', label: '🏃‍♂️ Coach' },
  athlete: { email: 'athlete@test.com', password: 'Athlete123!', label: '🏅 Athlete' },
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified');
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorParam === 'auth_failed' ? 'Authentication failed' : null);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const fillTestCredentials = (role: keyof typeof TEST_CREDENTIALS) => {
    const creds = TEST_CREDENTIALS[role];
    setEmail(creds.email);
    setPassword(creds.password);
    setShowPassword(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LoginForm] Form submitted');
    setError(null);

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      console.log('[LoginForm] Email validation failed:', emailValidation.errors);
      setError(emailValidation.errors[0]);
      return;
    }

    if (!password) {
      console.log('[LoginForm] Password is empty');
      setError('Please enter your password');
      return;
    }

    console.log('[LoginForm] Starting sign in for:', email);
    setLoading(true);

    try {
      // Collect device information for session tracking
      const deviceInfo = getDeviceInfo();
      console.log('[LoginForm] Device info collected:', deviceInfo.deviceId);
      
      const result = await signIn(email, password, deviceInfo);
      console.log('[LoginForm] Sign in result:', result.success ? 'Success' : 'Failed', result);

      if (!result.success) {
        setError(result.error || 'Incorrect email or password');
        setLoading(false);
        return;
      }

      // Redirect to /dashboard - middleware will handle role-based routing
      console.log('[LoginForm] Redirecting to /dashboard');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('[LoginForm] Login error:', error);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-0">
      <CardHeader className="space-y-3 pb-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
          <LogIn className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-center text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Welcome
        </CardTitle>
        <CardDescription className="text-center text-base">
          Sign in to manage your sports club
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {verified && (
          <div className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 p-4 border border-green-200">
            <p className="text-sm text-green-700 font-medium text-center">
              ✓ Email verified! You can sign in now.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                autoComplete="email"
                className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Password
              </Label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="pl-10 pr-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-gradient-to-r from-red-50 to-rose-50 p-4 border border-red-200">
              <p className="text-sm text-red-700 font-medium text-center">{error}</p>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading}
            className="relative z-20 w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Sign in
              </span>
            )}
          </Button>
        </form>

        {/* Test Credentials Section - Only visible in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="relative z-10 space-y-2 p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
            <p className="text-xs font-semibold text-amber-900 mb-3 flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Click to auto-fill test credentials
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fillTestCredentials('admin');
                }}
                className="relative z-20 px-3 py-2 text-xs font-medium rounded-md border-2 border-purple-300 bg-white hover:bg-purple-50 hover:border-purple-400 transition-all cursor-pointer active:scale-95"
              >
                {TEST_CREDENTIALS.admin.label}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fillTestCredentials('coach');
                }}
                className="relative z-20 px-3 py-2 text-xs font-medium rounded-md border-2 border-blue-300 bg-white hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer active:scale-95"
              >
                {TEST_CREDENTIALS.coach.label}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fillTestCredentials('athlete');
                }}
                className="relative z-20 px-3 py-2 text-xs font-medium rounded-md border-2 border-green-300 bg-white hover:bg-green-50 hover:border-green-400 transition-all cursor-pointer active:scale-95"
              >
                {TEST_CREDENTIALS.athlete.label}
              </button>
            </div>
            <p className="text-xs text-amber-700 mt-2">
              For testing only
            </p>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">or</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <a 
              href="/register" 
              className="font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Register for membership
            </a>
          </p>
        </div>

        {showForgotPassword && (
          <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm">
            <p className="text-sm text-blue-900 mb-3">
              Password reset will be available soon. Please contact an administrator for help.
            </p>
            <button
              onClick={() => setShowForgotPassword(false)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
