import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ArrowLeft, ClipboardList, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { AssignmentCard } from '@/components/athlete/AssignmentCard';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  category: string;
  status: string;
  priority: string;
  progress_percentage: number;
  target_value?: number;
  target_unit?: string;
  current_value?: number;
  due_date: string;
  frequency: string;
  created_at: string;
  athlete_notes?: string;
  coach_feedback?: string;
  coaches?: {
    first_name: string;
    last_name: string;
  };
}

export default async function AthleteAssignmentsPage() {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get athlete profile
  const { data: athleteData } = await db
    .from('athletes')
    .select('id, first_name, last_name, club_id')
    .eq('user_id', user.id)
    .single();

  const athlete = athleteData as { id: string; first_name: string; last_name: string; club_id: string } | null;

  if (!athlete) {
    redirect('/dashboard/athlete');
  }

  // Get all assignments for this athlete
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

  const assignments = (assignmentsData || []) as Assignment[];

  // Categorize assignments
  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const inProgressAssignments = assignments.filter(a => a.status === 'in_progress');
  const submittedAssignments = assignments.filter(a => a.status === 'submitted');
  const completedAssignments = assignments.filter(a => a.status === 'completed');
  const overdueAssignments = assignments.filter(a => a.status === 'overdue');

  const activeAssignments = [...pendingAssignments, ...inProgressAssignments, ...overdueAssignments];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/athlete"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-black" />
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-black">Assignments from coach</h1>
              <p className="text-sm text-gray-500">
                {activeAssignments.length} Tasks to do
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
            <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-lg font-bold text-black">{pendingAssignments.length}</p>
            <p className="text-xs text-gray-500">To do</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
            <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-blue-100 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-lg font-bold text-black">{inProgressAssignments.length}</p>
            <p className="text-xs text-gray-500">In progress</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
            <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-lg font-bold text-black">{completedAssignments.length}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
            <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-lg font-bold text-black">{overdueAssignments.length}</p>
            <p className="text-xs text-gray-500">Overdue</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-24 space-y-4">
        {/* Active Assignments */}
        {activeAssignments.length > 0 && (
          <div>
            <h2 className="font-bold text-black mb-3">Tasks to do</h2>
            <div className="space-y-3">
              {activeAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          </div>
        )}

        {/* Submitted Assignments */}
        {submittedAssignments.length > 0 && (
          <div>
            <h2 className="font-bold text-black mb-3">Awaiting coach review</h2>
            <div className="space-y-3">
              {submittedAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Assignments */}
        {completedAssignments.length > 0 && (
          <div>
            <h2 className="font-bold text-black mb-3">Completed</h2>
            <div className="space-y-3">
              {completedAssignments.slice(0, 5).map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!assignments || assignments.length === 0) && (
          <div className="text-center py-12">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No assignments yet
            </h3>
            <p className="text-sm text-gray-500">
              Your coach has not assigned any tasks yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
