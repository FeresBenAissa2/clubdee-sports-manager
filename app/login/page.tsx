import { createClient } from '@/lib/db/server';
import { SimpleLoginForm } from '@/components/auth/SimpleLoginForm';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <AuthSplitLayout>
      <SimpleLoginForm />
    </AuthSplitLayout>
  );
}
