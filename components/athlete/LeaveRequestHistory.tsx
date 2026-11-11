'use client';

import { useState } from 'react';
import { Clock, Check, X, FileText, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LeaveRequest {
  id: string;
  session_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  requested_at: string;
  reviewed_at?: string;
  session_name: string;
  session_date: string;
  start_time: string;
  reviewer_first_name?: string;
  reviewer_last_name?: string;
}

interface LeaveRequestHistoryProps {
  requests: LeaveRequest[];
}

export function LeaveRequestHistory({ requests }: LeaveRequestHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filteredRequests = requests.filter(req => 
    filter === 'all' || req.status === filter
  );

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            Pending review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <Check className="w-3 h-3 mr-1" />
            Approve
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <X className="w-3 h-3 mr-1" />
            Reject
          </Badge>
        );
    }
  };

  const getStatusColor = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'border-yellow-300 bg-yellow-50';
      case 'approved':
        return 'border-green-300 bg-green-50';
      case 'rejected':
        return 'border-red-300 bg-red-50';
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No leave history</h3>
        <p className="text-gray-600">You have not submitted any leave requests yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/*  filters Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'all'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({requests.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending review ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'approved'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Approve ({requests.filter(r => r.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'rejected'
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Reject ({requests.filter(r => r.status === 'rejected').length})
        </button>
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">No List in this category.</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className={`bg-white rounded-xl border-2 p-4 ${getStatusColor(request.status)}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {request.session_name}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600">
                    {new Date(request.session_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })} Time {request.start_time}
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>

              {/* Reason */}
              <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-1">Reason:</p>
                <p className="text-sm text-gray-900">{request.reason}</p>
              </div>

              {/* Review Notes */}
              {request.review_notes && (
                <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-1">
                    Coach comments:
                  </p>
                  <p className="text-sm text-gray-900">{request.review_notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-600 pt-3 border-t border-gray-200">
                <div>
                  <span className="font-medium">Notify when:</span>{' '}
                  {new Date(request.requested_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                {request.reviewed_at && (
                  <div>
                    <span className="font-medium">
                      {request.status === 'approved' ? 'Approve' : 'Reject'}When:
                    </span>{' '}
                    {new Date(request.reviewed_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
              {request.reviewer_first_name && (
                <div className="text-xs text-gray-600 mt-1">
                  <span className="font-medium">By:</span> {request.reviewer_first_name}{' '}
                  {request.reviewer_last_name}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
