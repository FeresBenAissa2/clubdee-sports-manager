'use client';

import { useState } from 'react';
import { ClipboardList, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { updateAssignmentProgress } from '@/lib/coach/assignment-actions';

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

interface AssignmentCardProps {
  assignment: Assignment;
}

const categoryLabels: Record<string, string> = {
  general: 'General',
  strength: 'Strength',
  cardio: 'Cardio',
  skill: 'Skills',
  flexibility: 'Flexibility',
  recovery: 'Recovery',
  technique: 'Technique',
};

const frequencyLabels: Record<string, string> = {
  once: 'Once',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: <Clock className="h-4 w-4" /> },
  in_progress: { label: 'Working on', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: <ClipboardList className="h-4 w-4" /> },
  submitted: { label: 'Sent', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: <Send className="h-4 w-4" /> },
  completed: { label: 'Finished', color: 'text-green-700', bgColor: 'bg-green-100', icon: <CheckCircle className="h-4 w-4" /> },
  overdue: { label: 'Overdue', color: 'text-red-700', bgColor: 'bg-red-100', icon: <AlertCircle className="h-4 w-4" /> },
  cancelled: { label: 'Cancel', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: <Clock className="h-4 w-4" /> },
};

const priorityColors: Record<string, string> = {
  low: 'border-l-gray-300',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(assignment.progress_percentage);
  const [notes, setNotes] = useState(assignment.athlete_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const status = statusConfig[assignment.status] || statusConfig.pending;
  const priorityColor = priorityColors[assignment.priority] || priorityColors.medium;
  const isEditable = ['pending', 'in_progress', 'overdue'].includes(assignment.status);

  const handleUpdateProgress = async (newProgress: number) => {
    setProgress(newProgress);
    setIsSubmitting(true);
    await updateAssignmentProgress(assignment.id, newProgress, notes);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await updateAssignmentProgress(assignment.id, 100, notes);
    setIsSubmitting(false);
  };

  const dueDate = new Date(assignment.due_date);
  const isOverdue = dueDate < new Date() && assignment.status !== 'completed';

  return (
    <div className={`bg-white rounded-2xl border-l-4 ${priorityColor} shadow-sm overflow-hidden`}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-bold text-black">{assignment.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-500">
                {categoryLabels[assignment.category] || assignment.category}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                {frequencyLabels[assignment.frequency] || assignment.frequency}
              </span>
              {assignment.coaches && (
                <>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    Coach {assignment.coaches.first_name}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.bgColor} ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                assignment.status === 'completed' ? 'bg-green-500' :
                assignment.status === 'overdue' ? 'bg-red-500' : 'bg-blue-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Due Date */}
        <div className={`mt-2 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          Due date: {dueDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
          {isOverdue && ' (Overdue)'}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          {/* Description */}
          {assignment.description && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Details</p>
              <p className="text-sm text-gray-700">{assignment.description}</p>
            </div>
          )}

          {/* Instructions */}
          {assignment.instructions && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-medium text-blue-700 mb-1">Tips from your coach</p>
              <p className="text-sm text-gray-700">{assignment.instructions}</p>
            </div>
          )}

          {/*  goals */}
          {assignment.target_value && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Goals:</span>
              <span className="text-sm font-medium text-black">
                {assignment.target_value} {assignment.target_unit}
              </span>
            </div>
          )}

          {/* Coach Feedback */}
          {assignment.coach_feedback && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs font-medium text-green-700 mb-1">Feedback from coach</p>
              <p className="text-sm text-gray-700">{assignment.coach_feedback}</p>
            </div>
          )}

          {/* Editable Section */}
          {isEditable && (
            <div className="space-y-3 pt-2">
              {/* Progress Slider */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">
                  Update progress
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={progress}
                  onChange={(e) => setProgress(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Your records
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Save progress, Issues found..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateProgress(progress)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Submit work
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
