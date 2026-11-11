'use client';

import { ClipboardList, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  priority: string;
  progress_percentage: number;
  due_date: string;
  created_at: string;
  athlete_notes?: string;
  coach_feedback?: string;
}

interface AthleteAssignmentsListProps {
  assignments: Assignment[];
}

const categoryLabels: Record<string, string> = {
  general: 'General',
  strength: 'Strength',
  cardio: 'cardio',
  skill: 'Skill',
  flexibility: 'Flexibility',
  recovery: 'Recovery',
  technique: 'TECHNIQUES',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: 'Doing', color: 'bg-blue-100 text-blue-700', icon: <ClipboardList className="h-3 w-3" /> },
  submitted: { label: 'Sent', color: 'bg-yellow-100 text-yellow-700', icon: <CheckCircle className="h-3 w-3" /> },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: <AlertCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancel', color: 'bg-gray-100 text-gray-500', icon: <XCircle className="h-3 w-3" /> },
};

const priorityColors: Record<string, string> = {
  low: 'border-l-gray-300',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};

export function AthleteAssignmentsList({ assignments }: AthleteAssignmentsListProps) {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No tasks assigned yet</p>
      </div>
    );
  }

  const activeAssignments = assignments.filter(a => ['pending', 'in_progress', 'submitted'].includes(a.status));
  const completedAssignments = assignments.filter(a => a.status === 'completed');
  const overdueAssignments = assignments.filter(a => a.status === 'overdue');

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-blue-50 rounded-lg p-2">
          <p className="text-lg font-bold text-blue-700">{activeAssignments.length}</p>
          <p className="text-xs text-blue-600">Doing</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <p className="text-lg font-bold text-green-700">{completedAssignments.length}</p>
          <p className="text-xs text-green-600">Done.</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2">
          <p className="text-lg font-bold text-red-700">{overdueAssignments.length}</p>
          <p className="text-xs text-red-600">Overdue</p>
        </div>
      </div>

      {/* Assignment List */}
      <div className="space-y-3">
        {assignments.slice(0, 5).map((assignment) => {
          const status = statusConfig[assignment.status] || statusConfig.pending;
          const priorityColor = priorityColors[assignment.priority] || priorityColors.medium;

          return (
            <div
              key={assignment.id}
              className={`border border-gray-200 rounded-xl p-3 border-l-4 ${priorityColor}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-black text-sm">{assignment.title}</h4>
                  <p className="text-xs text-gray-500">
                    {categoryLabels[assignment.category] || assignment.category}
                  </p>
                </div>
                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.color}`}>
                  {status.icon}
                  {status.label}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{assignment.progress_percentage}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${assignment.progress_percentage}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>determineSubmit: {new Date(assignment.due_date).toLocaleDateString('en-US')}</span>
              </div>

              {assignment.athlete_notes && (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">Athlete note: </span>
                    {assignment.athlete_notes}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
