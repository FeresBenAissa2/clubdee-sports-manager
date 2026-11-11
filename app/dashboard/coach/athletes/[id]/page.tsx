import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Calendar, TrendingUp, Target, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { AthleteGoalsList } from '@/components/coach/AthleteGoalsList';
import { CreateGoalDialog } from '@/components/coach/CreateGoalDialog';
import CreateProgressReportDialog from '@/components/coach/CreateProgressReportDialog';
import { CreateAssignmentDialog } from '@/components/coach/CreateAssignmentDialog';
import { AthleteAssignmentsList } from '@/components/coach/AthleteAssignmentsList';
import { ViewApplicationDialog } from '@/components/coach/ViewApplicationDialog';

interface Params {
  id: string;
}

export default async function AthleteDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get coach profile
  const coachResult = await db
    .from('profiles')
    .select('id, club_id')
    .eq('id', user.id)
    .eq('role', 'coach')
    .maybeSingle();
  const coach = coachResult.data as { id: string; club_id: string } | null;

  if (!coach) {
    redirect('/dashboard/coach');
  }

  // Get athlete details
  const athleteResult = await db
    .from('athletes')
    .select('*')
    .eq('id', id)
    .eq('club_id', coach.club_id)
    .single();
  const athlete = athleteResult.data as any;

  if (!athlete) {
    redirect('/dashboard/coach/athletes');
  }

  // Get attendance stats
  const { count: totalAttendance } = await db
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', athlete.id)
    .eq('status', 'present');

  // Get performance records count
  const { count: totalPerformance } = await db
    .from('performance_records')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', athlete.id);

  // Get recent attendance with feedback
  const { data: recentAttendance } = await db
    .from('attendance')
    .select(
      `
      *,
      training_sessions (
        session_name,
        session_date
      )
    `
    )
    .eq('athlete_id', athlete.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get recent performance records with notes
  const { data: recentPerformance } = await db
    .from('performance_records')
    .select('*')
    .eq('athlete_id', athlete.id)
    .order('test_date', { ascending: false })
    .limit(5);

  // Get goals
  const goalsResult = await db
    .from('athlete_goals')
    .select('*')
    .eq('athlete_id', athlete.id)
    .order('created_at', { ascending: false });
  const goals = goalsResult.data as any[] | null;

  const activeGoals = goals?.filter((g) => g.status === 'active') || [];
  const completedGoals = goals?.filter((g) => g.status === 'completed') || [];

  // Get training assignments
  const { data: assignmentsData } = await db
    .from('training_assignments')
    .select(`
      *,
      coaches (
        first_name,
        last_name
      )
    `)
    .eq('athlete_id', athlete.id)
    .order('created_at', { ascending: false });

  const assignments = (assignmentsData || []) as Array<{
    id: string;
    title: string;
    status: string;
    [key: string]: unknown;
  }>;

  const activeAssignments = assignments.filter(a => 
    ['pending', 'in_progress', 'submitted'].includes(a.status)
  );

  // Get membership application
  const { data: application } = await db
    .from('membership_applications')
    .select('*')
    .eq('user_id', athlete.user_id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/coach/athletes"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-black" />
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-black">
                {athlete.first_name} {athlete.last_name}
              </h1>
              {athlete.nickname && (
                <p className="text-sm text-gray-500">({athlete.nickname})</p>
              )}
            </div>
            <div className="flex gap-2">
              <ViewApplicationDialog 
                application={application}
                athleteName={`${athlete.first_name} ${athlete.last_name}`}
              />
              <CreateAssignmentDialog 
                athleteId={athlete.id}
                athleteName={`${athlete.first_name} ${athlete.last_name}`}
              />
              <CreateProgressReportDialog
                athleteId={athlete.id}
                athleteName={`${athlete.first_name} ${athlete.last_name}`}
              />
              <CreateGoalDialog athleteId={athlete.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-white text-2xl font-bold">
              {athlete.first_name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-black">
                {athlete.first_name} {athlete.last_name}
              </h2>
              {athlete.nickname && (
                <p className="text-sm text-gray-600">"{athlete.nickname}"</p>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {athlete.email && (
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{athlete.email}</span>
              </div>
            )}
            {athlete.phone_number && (
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{athlete.phone_number}</span>
              </div>
            )}
            {athlete.date_of_birth && (
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>
                  {new Date(athlete.date_of_birth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-black flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-black">{totalAttendance || 0}</p>
            <p className="text-xs text-gray-500">Attended</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-black flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-black">{totalPerformance || 0}</p>
            <p className="text-xs text-gray-500">Test results</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-black flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-black">{activeGoals.length}</p>
            <p className="text-xs text-gray-500">Goals</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-600 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-black">{activeAssignments.length}</p>
            <p className="text-xs text-gray-500">Assignments</p>
          </div>
        </div>

        {/* Training Assignments Section */}
        <div className="bg-white rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-black flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Training assignments
            </h3>
            <CreateAssignmentDialog 
              athleteId={athlete.id}
              athleteName={`${athlete.first_name} ${athlete.last_name}`}
            />
          </div>
          <AthleteAssignmentsList assignments={assignments as any} />
        </div>

        {/* Goals Section */}
        <div className="bg-white rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-black">Goals</h3>
            <div className="text-xs text-gray-500">
              {completedGoals.length} / {goals?.length || 0} Completed
            </div>
          </div>
          <AthleteGoalsList goals={goals || []} />
        </div>

        {/* Recent Performance */}
        {recentPerformance && recentPerformance.length > 0 && (
          <div className="bg-white rounded-2xl p-5">
            <h3 className="font-bold text-black mb-4">Latest test results</h3>
            <div className="space-y-3">
              {recentPerformance.map((record: any) => (
                <div
                  key={record.id}
                  className="border border-gray-200 rounded-xl p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-black text-sm">
                        {record.test_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(record.test_date).toLocaleDateString('en-US')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-black">
                        {record.score} {record.unit}
                      </p>
                    </div>
                  </div>
                  {record.coach_notes && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold">Note: </span>
                        {record.coach_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Attendance */}
        {recentAttendance && recentAttendance.length > 0 && (
          <div className="bg-white rounded-2xl p-5">
            <h3 className="font-bold text-black mb-4">Recent attendance</h3>
            <div className="space-y-3">
              {recentAttendance.map((log: any) => (
                <div key={log.id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-black text-sm">
                        {log.training_sessions?.session_name || 'Training'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(
                          log.training_sessions?.session_date || log.created_at
                        ).toLocaleDateString('en-US')}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        log.status === 'present'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {log.status === 'present' ? 'Present' : 'Absent'}
                    </span>
                  </div>
                  {log.coach_feedback && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold">Feedback: </span>
                        {log.coach_feedback}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacing */}
      <div className="h-24"></div>
    </div>
  );
}
