'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, MapPin, Edit, Trash2, AlertTriangle, Users } from 'lucide-react';
import { updateAnySession, deleteSession } from '@/lib/admin/attendance-actions';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface SessionWithDetails {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string | null;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  club_id: string;
  coach_id: string | null;
  attendance_count?: number;
  clubs?: {
    id: string;
    name: string;
    sport_type: string;
  };
  coaches?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface Club {
  id: string;
  name: string;
}

interface SessionsTableProps {
  sessions: SessionWithDetails[];
  clubs: Club[];
}

export function SessionsTable({ sessions, clubs }: SessionsTableProps) {
  const router = useRouter();
  const [filteredSessions, setFilteredSessions] = useState(sessions);
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchDate, setSearchDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<SessionWithDetails | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    session_date: '',
    start_time: '',
    end_time: '',
    location: '',
    status: 'scheduled' as 'scheduled' | 'ongoing' | 'completed' | 'cancelled',
  });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionWithDetails | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Apply filters
  const applyFilters = () => {
    let filtered = sessions;

    // Filter by club
    if (selectedClub !== 'all') {
      filtered = filtered.filter((session) => session.club_id === selectedClub);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((session) => session.status === selectedStatus);
    }

    // Filter by date
    if (searchDate) {
      filtered = filtered.filter((session) => session.session_date === searchDate);
    }

    setFilteredSessions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Apply filters whenever filter values change
  useState(() => {
    applyFilters();
  });

  // Pagination
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels = {
      scheduled: 'Schedule',
      ongoing: 'In progress',
      completed: 'Completed',
      cancelled: 'Cancel',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          badges[status as keyof typeof badges] || badges.scheduled
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  // Handle edit
  const handleEditClick = (session: SessionWithDetails) => {
    setSessionToEdit(session);
    setEditFormData({
      title: session.title,
      description: session.description || '',
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      location: session.location,
      status: session.status,
    });
    setEditError(null);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToEdit) return;

    setEditLoading(true);
    setEditError(null);

    // Validate
    if (editFormData.start_time >= editFormData.end_time) {
      setEditError('Start time must be before end time');
      setEditLoading(false);
      return;
    }

    const result = await updateAnySession(sessionToEdit.id, {
      title: editFormData.title,
      description: editFormData.description || undefined,
      session_date: editFormData.session_date,
      start_time: editFormData.start_time,
      end_time: editFormData.end_time,
      location: editFormData.location,
      status: editFormData.status,
    });

    if (result.error) {
      setEditError(result.error);
    } else {
      setEditDialogOpen(false);
      router.refresh();
    }

    setEditLoading(false);
  };

  // Handle delete
  const handleDeleteClick = (session: SessionWithDetails) => {
    setSessionToDelete(session);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;

    setDeleteLoading(true);
    setDeleteError(null);

    const result = await deleteSession(sessionToDelete.id);

    if (result.error) {
      setDeleteError(result.error);
    } else {
      setDeleteDialogOpen(false);
      router.refresh();
    }

    setDeleteLoading(false);
  };

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manage training sessions</CardTitle>
          <CardDescription>No training sessionsmade to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No training sessions in the system yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manage training sessions</CardTitle>
          <CardDescription>
            View and manage all training sessions in the system ({filteredSessions.length} items)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {/* Club Filter */}
            <div className="space-y-2">
              <Label>Filter by club</Label>
              <Select
                value={selectedClub}
                onValueChange={(value) => {
                  setSelectedClub(value);
                  setTimeout(applyFilters, 0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clubs</SelectItem>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Filter by status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  setSelectedStatus(value);
                  setTimeout(applyFilters, 0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="scheduled">Schedule</SelectItem>
                  <SelectItem value="ongoing">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <Label>Filter by date</Label>
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => {
                  setSearchDate(e.target.value);
                  setTimeout(applyFilters, 0);
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session name</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSessions.map((session) => (
                  <TableRow key={session.id}>
                    {/* Title */}
                    <TableCell className="font-medium">{session.title}</TableCell>

                    {/* Club */}
                    <TableCell>
                      <div>
                        <p className="font-medium">{session.clubs?.name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.clubs?.sport_type || ''}
                        </p>
                      </div>
                    </TableCell>

                    {/* Coach */}
                    <TableCell>
                      {session.coaches
                        ? `${session.coaches.first_name} ${session.coaches.last_name}`
                        : 'N/A'}
                    </TableCell>

                    {/* Date */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(session.session_date), 'dd MMM yyyy', { locale: th })}
                        </span>
                      </div>
                    </TableCell>

                    {/* Time */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {session.start_time} - {session.end_time}
                        </span>
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{session.location}</span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">{getStatusBadge(session.status)}</TableCell>

                    {/* Attendance Count */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{session.attendance_count || 0}</span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(session)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(session)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredSessions.length)} of{' '}
                {filteredSessions.length} items
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit training session</DialogTitle>
            <DialogDescription>EditInformationtraining session</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="edit-title">
                  Session name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  required
                  disabled={editLoading}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-description">Details</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  disabled={editLoading}
                  rows={3}
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="edit-date">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editFormData.session_date}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, session_date: e.target.value })
                  }
                  required
                  disabled={editLoading}
                />
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start-time">
                    Start time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-start-time"
                    type="time"
                    value={editFormData.start_time}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, start_time: e.target.value })
                    }
                    required
                    disabled={editLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-end-time">
                    End time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-end-time"
                    type="time"
                    value={editFormData.end_time}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, end_time: e.target.value })
                    }
                    required
                    disabled={editLoading}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="edit-location">
                  Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-location"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  required
                  disabled={editLoading}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value: any) =>
                    setEditFormData({ ...editFormData, status: value })
                  }
                  disabled={editLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Schedule</SelectItem>
                    <SelectItem value="ongoing">In progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editError && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-600">{editError}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirm session deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove session{' '}
              <strong>{sessionToDelete?.title}</strong>?
              <br />
              <br />
              This will delete all related attendance records and leave requests
              and unable toPresentBackhoeBackYes
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-600">{deleteError}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Delete session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
