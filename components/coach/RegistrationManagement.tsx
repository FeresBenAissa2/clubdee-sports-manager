'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { approveRegistration, rejectRegistration, removeAthleteFromActivity } from '@/lib/activity/actions';
import { useToast } from '@/components/ui/toast';

interface Activity {
  id: string;
  title: string;
  activity_registrations?: Array<{
    id: string;
    status: string;
    athlete_id: string;
    athlete_notes?: string;
    coach_notes?: string;
    rejection_reason?: string;
    registered_at: string;
    athletes: {
      first_name: string;
      last_name: string;
    };
  }>;
}

const statusLabels: Record<string, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Not approved',
  cancelled: 'Cancelled',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export function RegistrationManagement({ activity, onClose }: { activity: Activity; onClose: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { addToast } = useToast();

  const handleApprove = async (registrationId: string) => {
    setLoading(registrationId);
    const result = await approveRegistration(registrationId);
    setLoading(null);

    if (result.error) {
      addToast({
        title: 'An error occurred',
        description: result.error,
        variant: 'error',
      });
    } else {
      addToast({
        title: 'Approved successfully',
        description: 'Registration approved successfully',
        variant: 'success',
      });
      onClose();
    }
  };

  const handleReject = async (registrationId: string) => {
    if (!rejectionReason.trim()) {
      addToast({
        title: 'Please provide a reason',
        description: 'Please provide a reason for rejection',
        variant: 'error',
      });
      return;
    }

    setLoading(registrationId);
    const result = await rejectRegistration(registrationId, rejectionReason);
    setLoading(null);

    if (result.error) {
      addToast({
        title: 'An error occurred',
        description: result.error,
        variant: 'error',
      });
    } else {
      addToast({
        title: 'Rejected successfully',
        description: 'Registration rejected successfully',
        variant: 'success',
      });
      setRejectingId(null);
      setRejectionReason('');
      onClose();
    }
  };

  const handleRemove = async (registrationId: string) => {
    if (!confirm('Do you really want to remove Athletes from this event?')) {
      return;
    }

    setLoading(registrationId);
    const result = await removeAthleteFromActivity(registrationId);
    setLoading(null);

    if (result.error) {
      addToast({
        title: 'An error occurred',
        description: result.error,
        variant: 'error',
      });
    } else {
      addToast({
        title: 'Deleted successfully',
        description: 'Athletes has been successfully removed from the event.',
        variant: 'success',
      });
      onClose();
    }
  };

  const registrations = activity.activity_registrations || [];
  const pendingRegistrations = registrations.filter(r => r.status === 'pending');
  const approvedRegistrations = registrations.filter(r => r.status === 'approved');
  const otherRegistrations = registrations.filter(r => !['pending', 'approved'].includes(r.status));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage registration - {activity.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pending Registrations */}
          {pendingRegistrations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                Pending approval
                <Badge className="bg-yellow-100 text-yellow-800">
                  {pendingRegistrations.length}
                </Badge>
              </h3>
              <div className="space-y-3">
                {pendingRegistrations.map((reg) => (
                  <div key={reg.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">
                          {reg.athletes.first_name} {reg.athletes.last_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          RegisterWhen: {new Date(reg.registered_at).toLocaleString('en-US')}
                        </div>
                      </div>
                      <Badge className={statusColors[reg.status]}>
                        {statusLabels[reg.status]}
                      </Badge>
                    </div>

                    {reg.athlete_notes && (
                      <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium text-gray-700">Reason for attending:</div>
                        <div className="text-gray-600">{reg.athlete_notes}</div>
                      </div>
                    )}

                    {rejectingId === reg.id ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Add your reason for not approving..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectionReason('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(reg.id)}
                            disabled={loading === reg.id}
                          >
                            Confirm disapproval
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(reg.id)}
                          disabled={loading === reg.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectingId(reg.id)}
                          disabled={loading === reg.id}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Not approved
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Registrations */}
          {approvedRegistrations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                Approved
                <Badge className="bg-green-100 text-green-800">
                  {approvedRegistrations.length}
                </Badge>
              </h3>
              <div className="space-y-2">
                {approvedRegistrations.map((reg) => (
                  <div key={reg.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {reg.athletes.first_name} {reg.athletes.last_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        ApproveWhen: {new Date(reg.registered_at).toLocaleString('en-US')}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(reg.id)}
                      disabled={loading === reg.id}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Registrations */}
          {otherRegistrations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Other</h3>
              <div className="space-y-2">
                {otherRegistrations.map((reg) => (
                  <div key={reg.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {reg.athletes.first_name} {reg.athletes.last_name}
                      </div>
                      <Badge className={statusColors[reg.status]}>
                        {statusLabels[reg.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {registrations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Not yetRegister
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
