'use client';

import { useState, useMemo } from 'react';
import { SessionCard } from './SessionCard';
import { Database } from '@/types/database.types';
import { Search, Calendar as CalendarIcon, Download, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type TrainingSession = Database['public']['Tables']['training_sessions']['Row'];

interface SessionListEnhancedProps {
  sessions: (TrainingSession & { attendance_count?: number })[];
}

type FilterTab = 'upcoming' | 'past' | 'all';
type ViewMode = 'list' | 'calendar';

export function SessionListEnhanced({ sessions }: SessionListEnhancedProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({});
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search sessions
  const filteredSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = sessions;

    // Apply tab filter
    switch (activeTab) {
      case 'upcoming':
        filtered = filtered.filter((session) => {
          const sessionDate = new Date(session.session_date);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate >= today;
        });
        break;
      case 'past':
        filtered = filtered.filter((session) => {
          const sessionDate = new Date(session.session_date);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate < today;
        });
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (session) =>
          session.title.toLowerCase().includes(query) ||
          session.location.toLowerCase().includes(query) ||
          session.description?.toLowerCase().includes(query)
      );
    }

    // Apply date range filter
    if (dateFilter.start) {
      filtered = filtered.filter(
        (session) => session.session_date >= dateFilter.start!
      );
    }
    if (dateFilter.end) {
      filtered = filtered.filter(
        (session) => session.session_date <= dateFilter.end!
      );
    }

    // Sort by date
    return filtered.sort((a, b) => {
      const dateCompare = a.session_date.localeCompare(b.session_date);
      if (dateCompare !== 0) return dateCompare;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [sessions, activeTab, searchQuery, dateFilter]);

  // Export to CSV
  const handleExport = () => {
    const csvContent = [
      ['Date', 'Time', 'Name', 'Location', 'Present'].join(','),
      ...filteredSessions.map((s) =>
        [
          s.session_date,
          `${s.start_time}-${s.end_time}`,
          `"${s.title}"`,
          `"${s.location}"`,
          s.attendance_count || 0,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sessions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter({});
  };

  const hasActiveFilters = searchQuery || dateFilter.start || dateFilter.end;

  // Tab button styling
  const getTabClassName = (tab: FilterTab) => {
    const baseClasses = 'px-4 py-2 text-sm font-semibold rounded-full transition-all whitespace-nowrap';
    const activeClasses = 'bg-black text-white shadow-sm';
    const inactiveClasses = 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200';
    return `${baseClasses} ${activeTab === tab ? activeClasses : inactiveClasses}`;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search training sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-black text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                !
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredSessions.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          )}

          <div className="ml-auto text-sm text-gray-600">
            {filteredSessions.length} items
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start date
                </label>
                <Input
                  type="date"
                  value={dateFilter.start || ''}
                  onChange={(e) =>
                    setDateFilter({ ...dateFilter, start: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End date
                </label>
                <Input
                  type="date"
                  value={dateFilter.end || ''}
                  onChange={(e) =>
                    setDateFilter({ ...dateFilter, end: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab('upcoming')} className={getTabClassName('upcoming')}>
          Upcoming
        </button>
        <button onClick={() => setActiveTab('past')} className={getTabClassName('past')}>
          Past
        </button>
        <button onClick={() => setActiveTab('all')} className={getTabClassName('all')}>
          All
        </button>
      </div>

      {/* Session List */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-xl">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
            <CalendarIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-black mb-2">
            {hasActiveFilters ? 'No results found' : 'No training sessions'}
          </h3>
          <p className="text-sm text-gray-500">
            {hasActiveFilters
              ? 'Try adjusting your search filters'
              : activeTab === 'upcoming'
              ? 'No upcoming training sessions yet'
              : activeTab === 'past'
              ? 'No past training sessions yet'
              : 'No training sessions in the system yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
