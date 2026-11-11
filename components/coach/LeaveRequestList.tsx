'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { reviewLeaveRequest } from '@/lib/coach/attendance-actions';
import { CheckCircle, XCircle, Clock, User, Calendar, MapPin, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LeaveRequest {
  id: string;
  session_id: string;
  athlete_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  training_sessions?: {
    id: string;
    title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    location: string;
  };
  athletes?: {
    id: string;
    first_name: string;
    last_name: string;
    nickname: string | null;
  };
}

interface LeaveRequestListProps {
  requests: LeaveRequest[];
  filter?: 'pending' | 'approved' | 'rejected' | 'all';
}

export function LeaveRequestList({ requests, filter = 'all' }: LeaveRequestListProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReviewClick = (request: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
  };

  const handleConfirmReview = async () => {
    if (!selectedRequest || !reviewAction) return;
    setIsSubmitting(true);

    try {
      const result = await reviewLeaveRequest(selectedRequest.id, reviewAction);
      if (result.error) {
        addToast({ title: 'An error occurred', description: result.error, variant: 'error' });
      } else {
        addToast({
          title: reviewAction === 'approve' ? 'Leave request approved' : 'Leave request rejected',
          description: 'Leave request already processed',
          variant: 'success',
        });
        setSelectedRequest(null);
        setReviewAction(null);
        router.refresh();
      }
    } catch (error) {
      addToast({ title: 'An error occurred', description: 'An unexpected error occurred', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAthleteName = (request: LeaveRequest) => {
    if (!request.athletes) return 'Athletes';
    const { first_name, last_name, nickname } = request.athletes;
    return nickname ? `${first_name} "${nickname}" ${last_name}` : `${first_name} ${last_name}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approve</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Reject</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatTime = (timeString: string) => timeString.substring(0, 5);
  const formatDateTime = (dateTimeString: string) => new Date(dateTimeString).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {filter === 'pending' && 'No leave requests pending review'}
          {filter === 'approved' && 'No approved leave requests'}
          {filter === 'rejected' && 'No rejected leave requests'}
          {filter === 'all' && 'No leave requests'}
        </h3>
        <p className="text-sm text-gray-500">
          {filter === 'pending' && 'When athletes request leave, requests will appear here'}
          {filter !== 'pending' && 'No leave requests in this category'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <CardTitle className="text-lg">{getAthleteName(request)}</CardTitle>
                    {getStatusBadge(request.status)}
                  </div>
                  {request.training_sessions && (
                    <CardDescription>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          <span>{request.training_sessions.title} - {formatDate(request.training_sessions.session_date)} {formatTime(request.training_sessions.start_time)}-{formatTime(request.training_sessions.end_time)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          <span>{request.training_sessions.location}</span>
                        </div>
                      </div>
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Reason:</div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{request.reason}</div>
                </div>
                <div className="text-xs text-gray-500">Requested on: {formatDateTime(request.requested_at)}</div>
                {request.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => handleReviewClick(request, 'approve')} className="flex-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />Approve
                    </Button>
                    <Button onClick={() => handleReviewClick(request, 'reject')} variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50">
                      <XCircle className="w-4 h-4 mr-2" />Reject
                    </Button>
                  </div>
                )}
                {request.status !== 'pending' && request.reviewed_at && (
                  <div className="text-xs text-gray-500 pt-2 border-t">Reviewed on: {formatDateTime(request.reviewed_at)}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={selectedRequest !== null} onOpenChange={(open) => { if (!open) { setSelectedRequest(null); setReviewAction(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === 'approve' ? 'Confirm leave approval' : 'Confirm leave rejection'}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                {selectedRequest && (
                  <>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">{getAthleteName(selectedRequest)}</div>
                      {selectedRequest.training_sessions && (
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>{selectedRequest.training_sessions.title}</div>
                          <div>{formatDate(selectedRequest.training_sessions.session_date)} {formatTime(selectedRequest.training_sessions.start_time)}-{formatTime(selectedRequest.training_sessions.end_time)}</div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Reason:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedRequest.reason}</div>
                    </div>
                    {reviewAction === 'approve' ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-green-700"> Once approved, the system will save the status as"Excused" automatically</div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-red-700">WhenReject AthletesmustPresentTrainingas perNormal</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedRequest(null); setReviewAction(null); }} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleConfirmReview} disabled={isSubmitting} className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />In progress...</> : <>{reviewAction === 'approve' ? <><CheckCircle className="w-4 h-4 mr-2" />Confirm approval</> : <><XCircle className="w-4 h-4 mr-2" />Confirm rejection</>}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
