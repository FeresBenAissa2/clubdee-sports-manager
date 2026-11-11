import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import ProfileEditFormComplete from '@/components/athlete/ProfileEditFormComplete';

export default async function AthleteProfileEditPage() {
  const db = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get athlete profile
  const { data: athlete, error: profileError } = await db
    .from('athletes')
    .select(
      `
      *,
      clubs (
        id,
        name
      )
    `
    )
    .eq('user_id', user.id)
    .single();

  // Get membership application to retrieve documents
  const { data: application } = await db
    .from('membership_applications')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .single();

  if (profileError || !athlete) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900">Edit profile</h1>
          <p className="mt-4 text-red-600">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit profile</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Update your personal information and documents
          </p>
        </div>

        <ProfileEditFormComplete athlete={athlete} application={application} />
      </div>
    </div>
  );
}
