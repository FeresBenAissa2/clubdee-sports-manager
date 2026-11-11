import { ParentLoginForm } from '@/components/parent/ParentLoginForm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function ParentLoginPage() {
  // If already signed in, redirect to dashboard
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('parent_session')?.value;
  
  if (sessionToken) {
    redirect('/parent/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Parent portal
          </h1>
          <p className="text-gray-600">
            Track your child's progress
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <ParentLoginForm />
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Didn't receive a confirmation email?{' '}
            <Link href="/contact" className="text-blue-600 hover:underline font-medium">
              Contact the club
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            Are you an athlete or coach?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Main sign-in
            </Link>
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            💡 How to sign in
          </h3>
          <ol className="text-xs text-blue-800 space-y-1">
            <li>1. Your child adds your email in the system</li>
            <li>2. You will receive a confirmation email</li>
            <li>3. Click the link in the email to set your password</li>
            <li>4. sign in with your email and password</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
