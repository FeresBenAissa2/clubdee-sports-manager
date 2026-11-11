import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ChevronLeft, User, Mail, Phone, FileText, ClipboardList, Target } from 'lucide-react';
import Link from 'next/link';

interface Athlete {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  email: string;
  phone_number?: string;
  gender?: string;
  profile_picture_url?: string;
  club_id: string;
}

export default async function CoachAthletesPage() {
  const db = await createClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // A coach can be linked to several clubs (one coaches row per club)
  const { data: coachRows } = await db
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id);

  const clubIds = [...new Set((coachRows || []).map((c: { club_id: string }) => c.club_id))];

  if (clubIds.length === 0) {
    redirect('/dashboard/coach');
  }

  // Get all athletes in the coach's clubs
  const { data: athletes } = (await db
    .from('athletes')
    .select('*')
    .in('club_id', clubIds)
    .order('first_name', { ascending: true })) as { data: Athlete[] | null };

  // Get membership applications for these athletes
  const athleteUserIds = athletes?.map(a => a.user_id) || [];
  const { data: applicationsData } = await db
    .from('membership_applications')
    .select('*')
    .in('user_id', athleteUserIds.length > 0 ? athleteUserIds : ['none']);

  const applications = (applicationsData || []) as Array<{ user_id: string; [key: string]: unknown }>;

  // Get training assignments count per athlete
  const athleteIds = athletes?.map(a => a.id) || [];
  const { data: assignmentCountsData } = await db
    .from('training_assignments')
    .select('athlete_id, status')
    .in('athlete_id', athleteIds.length > 0 ? athleteIds : ['none']);

  const assignmentCounts = (assignmentCountsData || []) as Array<{ athlete_id: string; status: string }>;

  // Create lookup maps
  const applicationMap = new Map(
    applications.map(app => [app.user_id, app])
  );
  
  const assignmentCountMap = new Map<string, { active: number; completed: number }>();
  assignmentCounts.forEach(a => {
    const current = assignmentCountMap.get(a.athlete_id) || { active: 0, completed: 0 };
    if (['pending', 'in_progress', 'submitted'].includes(a.status)) {
      current.active++;
    } else if (a.status === 'completed') {
      current.completed++;
    }
    assignmentCountMap.set(a.athlete_id, current);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl p-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/coach"
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Athlete roster
              </h1>
              <p className="text-sm text-gray-600">
                All athletes in your clubs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-6">
        {athletes && athletes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {athletes.map((athlete) => {
              const application = applicationMap.get(athlete.user_id);
              const assignments = assignmentCountMap.get(athlete.id) || { active: 0, completed: 0 };
              
              return (
                <div
                  key={athlete.id}
                  className="rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
                >
                  <Link href={`/dashboard/coach/athletes/${athlete.id}`}>
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        {athlete.profile_picture_url ? (
                          <img
                            src={athlete.profile_picture_url}
                            alt={`${athlete.first_name} ${athlete.last_name}`}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {athlete.first_name} {athlete.last_name}
                        </h3>
                        {athlete.nickname && (
                          <p className="text-sm text-gray-600">
                            ({athlete.nickname})
                          </p>
                        )}
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3 w-3" />
                            <span className="text-xs truncate">{athlete.email}</span>
                          </div>
                          {athlete.phone_number && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              <span className="text-xs">{athlete.phone_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Stats Row */}
                  <div className="mt-4 flex items-center gap-3 text-xs">
                    {application && (
                      <span className="flex items-center gap-1 text-green-600">
                        <FileText className="h-3 w-3" />
                        Has application
                      </span>
                    )}
                    {assignments.active > 0 && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <ClipboardList className="h-3 w-3" />
                        {assignments.active} tasks
                      </span>
                    )}
                    {assignments.completed > 0 && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Target className="h-3 w-3" />
                        {assignments.completed} done
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/coach/athletes/${athlete.id}`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                    >
                      <User className="h-4 w-4" />
                      <span>View profile</span>
                    </Link>
                    <Link
                      href={`/dashboard/coach/athletes/${athlete.id}?tab=application`}
                      className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                        application 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/dashboard/coach/athletes/${athlete.id}?tab=assignments`}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <ClipboardList className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No athletes yet
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              There are no athletes in your club yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
