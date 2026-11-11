'use client';

import { Calendar, List } from 'lucide-react';

interface ScheduleViewToggleProps {
  view: 'calendar' | 'list';
  onViewChange: (view: 'calendar' | 'list') => void;
}

export function ScheduleViewToggle({ view, onViewChange }: ScheduleViewToggleProps) {
  return (
    <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onViewChange('list')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          view === 'list'
            ? 'bg-white text-black shadow-sm'
            : 'text-gray-600 hover:text-black'
        }`}
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">Items</span>
      </button>
      <button
        onClick={() => onViewChange('calendar')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          view === 'calendar'
            ? 'bg-white text-black shadow-sm'
            : 'text-gray-600 hover:text-black'
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span className="hidden sm:inline">Calendar</span>
      </button>
    </div>
  );
}
