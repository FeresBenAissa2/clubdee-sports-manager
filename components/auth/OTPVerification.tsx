'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyOTP, resendOTP } from '@/lib/auth/actions';
import { validateOTP } from '@/lib/auth/validation';

export function OTPVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate OTP
    const validation = validateOTP(otp);
    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    setLoading(true);

    try {
      const result = await verifyOTP(email, otp);

      if (!result.success) {
        setError(result.error || 'Invalid OTP code');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/register-membership');
      }, 2000);
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendSuccess(false);
    setError(null);

    try {
      const result = await resendOTP(email);

      if (!result.success) {
        setError(result.error || 'Failed to resend OTP');
        setResending(false);
        return;
      }

      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch {
      setError('Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email verified! ✅</CardTitle>
          <CardDescription>Your email has been confirmed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-600">Redirecting you to sports club registration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification code</Label>
            <Input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              required
            />
            <p className="text-sm text-gray-500">Enter the 6-digit code from your email</p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {resendSuccess && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-600">A new code has been sent to your email!</p>
            </div>
          )}

          <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
            {loading ? 'Verifying...' : 'Verify email'}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Didn&apos;t receive a code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
