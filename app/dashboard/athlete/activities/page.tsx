import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ActivityList } from '@/components/athlete/ActivityList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function AthleteActivitiesPage() {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get athlete profile
  const { data: athlete } = await db
    .from('athletes')
    .select('id, club_id')
    .eq('user_id', user.id)
    .single();

  if (!athlete) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Athlete profile not found</h2>
          <p className="text-sm text-gray-600">Please contact an administrator</p>
        </div>
      </div>
    );
  }

  // Get upcoming activities
  const { data: upcomingActivities } = await db
    .from('activities')
    .select(`
      *,
      coaches (first_name, last_name),
      activity_registrations!left (
        id,
        status,
        athlete_id,
        rejection_reason,
        coach_notes
      ),
      activity_checkins!left (
        id,
        status,
        checked_in_at,
        checked_out_at,
        athlete_id
      )
    `)
    .eq('club_id', (athlete as any).club_id)
    .eq('status', 'scheduled')
    .gte('activity_date', new Date().toISOString().split('T')[0])
    .order('activity_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(50);

  // Get past activities with check-ins
  const { data: pastActivities } = await db
    .from('activities')
    .select(`
      *,
      coaches (first_name, last_name),
      activity_checkins!left (
        id,
        status,
        checked_in_at,
        checked_out_at,
        athlete_id
      )
    `)
    .eq('club_id', (athlete as any).club_id)
    .lt('activity_date', new Date().toISOString().split('T')[0])
    .order('activity_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(30);

  // Get my registrations (all statuses)
  const { data: myRegistrations } = await db
    .from('activity_registrations')
    .select(`
      *,
      activities (
        *,
        coaches (first_name, last_name),
        activity_checkins!left (
          id,
          status,
          checked_in_at,
          checked_out_at,
          athlete_id
        )
      )
    `)
    .eq('athlete_id', (athlete as any).id)
    .in('status', ['pending', 'approved'])
    .order('registered_at', { ascending: false });

  // Calculate statistics
  const upcomingCount = upcomingActivities?.length || 0;
  const registrationCount = myRegistrations?.filter((r: any) => r.status === 'pending' || r.status === 'approved').length || 0;
  const checkedInCount = pastActivities?.filter((a: any) => 
    a.activity_checkins?.some((c: any) => c.athlete_id === (athlete as any).id)
  ).length || 0;

  return (
    <div className="max-w-lg mx-auto pb-6">
      {/* Minimal Header */}
      <div className="bg-black text-white rounded-lg p-6 mb-4">
        <h1 className="text-xl font-bold mb-4">Activities</h1>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-3xl font-bold">{upcomingCount}</p>
            <p className="text-xs text-gray-400 mt-1">Upcoming</p>
          </div>
          <div className="text-center border-x border-gray-700">
            <p className="text-3xl font-bold">{registrationCount}</p>
            <p className="text-xs text-gray-400 mt-1">Register</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{checkedInCount}</p>
            <p className="text-xs text-gray-400 mt-1">Registered</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200 rounded-lg p-1 mb-4">
          <TabsTrigger 
            value="upcoming" 
            className="text-xs data-[state=active]:bg-black data-[state=active]:text-white rounded"
          >
            Upcoming
          </TabsTrigger>
          <TabsTrigger 
            value="registrations" 
            className="text-xs data-[state=active]:bg-black data-[state=active]:text-white rounded"
          >
            Register
          </TabsTrigger>
          <TabsTrigger 
            value="past" 
            className="text-xs data-[state=active]:bg-black data-[state=active]:text-white rounded"
          >
            Elapsed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-0">
          <ActivityList
            activities={upcomingActivities || []}
            athleteId={(athlete as any).id}
            type="upcoming"
          />
        </TabsContent>

        <TabsContent value="registrations" className="mt-0">
          <ActivityList
            activities={myRegistrations?.map((r: any) => r.activities).filter(Boolean) || []}
            athleteId={(athlete as any).id}
            registrations={myRegistrations || []}
            type="registrations"
          />
        </TabsContent>

        <TabsContent value="past" className="mt-0">
          <ActivityList
            activities={pastActivities || []}
            athleteId={(athlete as any).id}
            type="past"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
