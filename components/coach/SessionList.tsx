'use client';

import { useState } from 'react';
import { SessionCard } from './SessionCard';
import { Database } from '@/types/database.types';
import { SessionListSkeleton } from '@/components/ui/loading-skeletons';

type TrainingSession = Database['public']['Tables']['training_sessions']['Row'];

interface SessionListProps {
  sessions: (TrainingSession & { attendance_count?: number })[];
  onViewDetails?: (sessionId: string) => void;
  onEdit?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
  isLoading?: boolean;
}

type FilterTab = 'upcoming' | 'past' | 'all';

export function SessionList({
  sessions,
  onViewDetails,
  onEdit,
  onCancel,
  isLoading = false,
}: SessionListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');

  // Show loading skeleton
  if (isLoading) {
    return <SessionListSkeleton />;
  }

  // Filter sessions based on active tab
  const filterSessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (activeTab) {
      case 'upcoming':
        return sessions.filter((session) => {
          const sessionDate = new Date(session.session_date);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate >= today;
        });
      case 'past':
        return sessions.filter((session) => {
          const sessionDate = new Date(session.session_date);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate < today;
        });
      case 'all':
        return sessions;
      default:
        return sessions;
    }
  };

  const filteredSessions = filterSessions();

  // Tab button styling - Native App Style (Black & White)
  const getTabClassName = (tab: FilterTab) => {
    const baseClasses =
      'px-5 py-2.5 text-sm font-semibold rounded-full transition-all whitespace-nowrap';
    const activeClasses = 'bg-black text-white shadow-sm';
    const inactiveClasses =
      'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200';

    return `${baseClasses} ${
      activeTab === tab ? activeClasses : inactiveClasses
    }`;
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs - Native App Style */}
      <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={getTabClassName('upcoming')}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={getTabClassName('past')}
        >
          Past
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={getTabClassName('all')}
        >
          All
        </button>
      </div>

      {/* Session List */}
      {filteredSessions.length === 0 ? (
        // Empty State - Native App Style
        <div className="text-center py-16 px-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-black mb-2">
            No training sessions
          </h3>
          <p className="text-sm text-gray-500">
            {activeTab === 'upcoming' &&
              'No upcoming training sessions yet'}
            {activeTab === 'past' && 'No past training sessions yet'}
            {activeTab === 'all' && 'No training sessions in the system yet'}
          </p>
        </div>
      ) : (
        // Session Cards - Single Column for Mobile Native Feel
        <div className="space-y-3 px-4">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
