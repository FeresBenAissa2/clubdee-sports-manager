'use client';

import { useState } from 'react';
import { Bell, Pin, Trash2, Edit, MoreVertical, Eye, PinOff, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteAnnouncement, updateAnnouncement } from '@/lib/coach/announcement-actions';
import { useToast } from '@/hooks/useToast';
import { EditAnnouncementDialog } from './EditAnnouncementDialog';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  read_count?: number;
}

interface AnnouncementListProps {
  announcements: Announcement[];
  totalAthletes?: number;
}

export function AnnouncementList({ announcements, totalAthletes = 0 }: AnnouncementListProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [togglingPinId, setTogglingPinId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    setDeletingId(id);
    try {
      const result = await deleteAnnouncement(id);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Announcement deleted successfully',
        });
      } else {
        toast({
          title: 'An error occurred',
          description: result.error || 'Could not delete announcement.',
          variant: 'error',
        });
      }
    } catch (error) {
      toast({
        title: 'An error occurred',
        description: 'Could not delete announcement.',
        variant: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    setTogglingPinId(announcement.id);
    try {
      const result = await updateAnnouncement({
        id: announcement.id,
        is_pinned: !announcement.is_pinned,
      });
      
      if (result.success) {
        toast({
          title: 'Success',
          description: announcement.is_pinned ? 'Unpinned' : 'Announcement pinned',
        });
      } else {
        toast({
          title: 'An error occurred',
          description: result.error || 'Could not update announcement.',
          variant: 'error',
        });
      }
    } catch (error) {
      toast({
        title: 'An error occurred',
        description: 'Could not update announcement.',
        variant: 'error',
      });
    } finally {
      setTogglingPinId(null);
    }
  };

  const getReadCount = (announcement: Announcement) => {
    return announcement.read_count || 0;
  };

  const getReadPercentage = (announcement: Announcement) => {
    if (totalAthletes === 0) return 0;
    const readCount = getReadCount(announcement);
    return Math.round((readCount / totalAthletes) * 100);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgent';
      case 'high':
        return 'Important';
      case 'normal':
        return 'Normal';
      case 'low':
        return 'Low';
      default:
        return priority;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter and search
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesSearch =
      searchQuery === '' ||
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority =
      priorityFilter === 'all' || announcement.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  if (announcements.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Bell className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-black mb-2">No announcements yet</h3>
        <p className="text-sm text-gray-500">
          Create an announcement to notify athletes in your club
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
          <Bell className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        {/* Priority Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setPriorityFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              priorityFilter === 'all'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            All ({announcements.length})
          </button>
          <button
            onClick={() => setPriorityFilter('urgent')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              priorityFilter === 'urgent'
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            Urgent ({announcements.filter((a) => a.priority === 'urgent').length})
          </button>
          <button
            onClick={() => setPriorityFilter('high')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              priorityFilter === 'high'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            Important ({announcements.filter((a) => a.priority === 'high').length})
          </button>
          <button
            onClick={() => setPriorityFilter('normal')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              priorityFilter === 'normal'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            Normal ({announcements.filter((a) => a.priority === 'normal').length})
          </button>
        </div>
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-gray-600">
          Found {filteredAnnouncements.length} announcement(s)
        </p>
      )}

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-black mb-2">No announcements found</h3>
          <p className="text-sm text-gray-500">
            Try another search term or change your filters
          </p>
        </div>
      ) : (
        <div className="space-y-3">
      {filteredAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {announcement.is_pinned && (
                  <Pin className="h-4 w-4 text-black" />
                )}
                <h3 className="font-bold text-black line-clamp-1">
                  {announcement.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getPriorityColor(
                    announcement.priority
                  )}`}
                >
                  {getPriorityLabel(announcement.priority)}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(announcement.created_at)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setEditingAnnouncement(announcement)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleTogglePin(announcement)}
                  disabled={togglingPinId === announcement.id}
                >
                  {announcement.is_pinned ? (
                    <>
                      <PinOff className="h-4 w-4 mr-2" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4 mr-2" />
                      Pin
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(announcement.id)}
                  disabled={deletingId === announcement.id}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete announcement
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {announcement.message}
          </p>

          {/* Read Statistics */}
          {totalAthletes > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-gray-600">
                  <Eye className="h-3.5 w-3.5" />
                  <span>
                    Read {getReadCount(announcement)} / {totalAthletes} athletes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${getReadPercentage(announcement)}%` }}
                    />
                  </div>
                  <span className="text-gray-600 font-medium">
                    {getReadPercentage(announcement)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

        </div>
      )}

      {/* Edit Dialog */}
      {editingAnnouncement && (
        <EditAnnouncementDialog
          announcement={editingAnnouncement}
          open={!!editingAnnouncement}
          onOpenChange={(open) => !open && setEditingAnnouncement(null)}
        />
      )}
    </div>
  );
}
