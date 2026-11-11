import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { CoachActivityList } from '@/components/coach/CoachActivityList';
import { CreateActivityDialog } from '@/components/coach/CreateActivityDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function CoachActivitiesPage() {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get coach profile
  const { data: coach } = await db
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    return <div>Coach profile not found</div>;
  }

  // Get all activities
  const { data: activities } = await db
    .from('activities')
    .select(`
      *,
      activity_registrations (
        id,
        status,
        athlete_id,
        athletes (first_name, last_name)
      ),
      activity_checkins (
        id,
        status,
        checked_in_at,
        athlete_id,
        athletes (first_name, last_name)
      )
    `)
    .eq('club_id', (coach as any).club_id)
    .order('activity_date', { ascending: false })
    .order('start_time', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage activities</h1>
            <p className="text-gray-600 mt-2">
              Create activities, generate QR codes, and manage registrations
            </p>
          </div>
          <CreateActivityDialog>
            <Button size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Create activity
            </Button>
          </CreateActivityDialog>
        </div>

        <CoachActivityList activities={activities || []} />
      </div>
    </div>
  );
}
