import { OTPVerification } from '@/components/auth/OTPVerification';
import { Suspense } from 'react';

function OTPVerificationContent() {
  return <OTPVerification />;
}

export default function VerifyOTPPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <OTPVerificationContent />
      </Suspense>
    </div>
  );
}
