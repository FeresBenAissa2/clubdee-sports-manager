'use client';

import { useState } from 'react';
import { Target, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { updateGoal, deleteGoal } from '@/lib/coach/goal-actions';

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  target_value?: number;
  target_unit?: string;
  current_value: number;
  progress_percentage: number;
  status: string;
  priority: string;
  start_date: string;
  target_date: string;
  completed_at?: string;
}

interface AthleteGoalsListProps {
  goals: Goal[];
}

export function AthleteGoalsList({ goals }: AthleteGoalsListProps) {
  const [updatingGoals, setUpdatingGoals] = useState<Set<string>>(new Set());

  if (!goals || goals.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="h-12 w-12 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No goals yet</p>
      </div>
    );
  }

  const handleUpdateProgress = async (goalId: string, newProgress: number) => {
    setUpdatingGoals((prev) => new Set(prev).add(goalId));

    await updateGoal({
      id: goalId,
      progressPercentage: newProgress,
    });

    setUpdatingGoals((prev) => {
      const next = new Set(prev);
      next.delete(goalId);
      return next;
    });
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm('Are you sure to delete this goal?')) return;

    setUpdatingGoals((prev) => new Set(prev).add(goalId));
    await deleteGoal(goalId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'overdue':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700',
    };
    const labels = {
      high: 'High',
      medium: 'Average',
      low: 'Low',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[priority as keyof typeof colors]}`}>
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <div
          key={goal.id}
          className={`border-2 rounded-xl p-4 ${getStatusColor(goal.status)}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2 flex-1">
              {getStatusIcon(goal.status)}
              <div className="flex-1">
                <h4 className="font-semibold text-black text-sm">{goal.title}</h4>
                {goal.description && (
                  <p className="text-xs text-gray-600 mt-1">{goal.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getPriorityBadge(goal.priority)}
              <button
                onClick={() => handleDelete(goal.id)}
                disabled={updatingGoals.has(goal.id)}
                className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            </div>
          </div>

          {goal.target_value && (
            <div className="text-xs text-gray-600 mb-2">
              Target: {goal.target_value} {goal.target_unit}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span className="font-semibold">{goal.progress_percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  goal.progress_percentage >= 100
                    ? 'bg-green-600'
                    : goal.status === 'overdue'
                    ? 'bg-red-600'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Progress Update Slider */}
          {goal.status === 'active' && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <label className="text-xs text-gray-600 block mb-1">
                Update progress
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={goal.progress_percentage}
                onChange={(e) =>
                  handleUpdateProgress(goal.id, parseInt(e.target.value))
                }
                disabled={updatingGoals.has(goal.id)}
                className="w-full"
              />
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
            <span>
              Go: {new Date(goal.start_date).toLocaleDateString('en-US')}
            </span>
            <span>
              Target: {new Date(goal.target_date).toLocaleDateString('en-US')}
            </span>
          </div>

          {goal.completed_at && (
            <div className="text-xs text-green-600 mt-2">
              ✓ SuccessWhen: {new Date(goal.completed_at).toLocaleDateString('en-US')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
