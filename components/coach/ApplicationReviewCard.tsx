'use client';

/**
 * Application Review Card Component
 * 
 * Validates: Requirements US-3, AC3
 * - US-3: Coach reviews applications for their club
 * - AC3: Coach Approval Process - Approve or reject with reason
 * 
 * Features:
 * - Display application details (personal info, documents)
 * - Approve button with confirmation
 * - Reject button with reason dialog
 * - Show application status and date
 * - View documents and personal information
 */

import { useState } from 'react';
import { reviewApplication } from '@/lib/membership/actions';
import { MembershipApplication } from '@/types/database.types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { CheckCircle, XCircle, Calendar, User, Phone, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ApplicationReviewCardProps {
  application: MembershipApplication & {
    clubs?: {
      name: string;
      sport_type: string;
    };
  };
  /** Called after a successful approve/reject so client-loaded lists can reload. */
  onReviewed?: () => void;
}

export function ApplicationReviewCard({ application, onReviewed }: ApplicationReviewCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const personalInfo = application.personal_info as any;
  const documents = application.documents as any[];

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await reviewApplication(application.id, 'approve');

      if (result.success) {
        toast({
          title: 'Approved successfully',
          description: 'Application approved. The athlete can access the dashboard right away.',
        });
        onReviewed?.();
        router.refresh();
      } else {
        toast({
          title: 'An error occurred',
          description: result.error || 'Cannot approve application',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Error approving application:', error);
      toast({
        title: 'An error occurred',
        description: 'Cannot approve application',
        variant: 'error',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Please provide a reason',
        description: 'Please provide a rejection reason',
        variant: 'error',
      });
      return;
    }

    setIsRejecting(true);
    try {
      const result = await reviewApplication(
        application.id,
        'reject',
        rejectionReason
      );

      if (result.success) {
        toast({
          title: 'Rejected successfully',
          description: 'Application rejected successfully',
        });
        setShowRejectDialog(false);
        setRejectionReason('');
        onReviewed?.();
        router.refresh();
      } else {
        toast({
          title: 'An error occurred',
          description: result.error || 'Cannot reject application',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: 'An error occurred',
        description: 'Cannot reject application',
        variant: 'error',
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending: { label: 'Pending review', variant: 'secondary' },
      approved: { label: 'Approved', variant: 'default' },
      rejected: { label: 'already rejected', variant: 'error' },
      info_requested: { label: 'Request additional information', variant: 'outline' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              {personalInfo?.full_name || 'Unnamed'}
            </h3>
            {application.clubs && (
              <p className="text-sm text-gray-500">
                {application.clubs.name} ({application.clubs.sport_type})
              </p>
            )}
          </div>
          {getStatusBadge(application.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Application Date */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Applied on: {formatDate(application.created_at)}</span>
        </div>

        {/* Personal Information */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Personal information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {personalInfo?.phone_number && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{personalInfo.phone_number}</span>
              </div>
            )}
            {personalInfo?.date_of_birth && (
              <div className="text-gray-600">
                Date of birth: {formatDate(personalInfo.date_of_birth)}
              </div>
            )}
            {personalInfo?.blood_type && (
              <div className="text-gray-600">
                BLOOD GROUP: {personalInfo.blood_type}
              </div>
            )}
          </div>
          {personalInfo?.address && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Address:</span> {personalInfo.address}
            </div>
          )}
          {personalInfo?.emergency_contact && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Emergency Contact:</span>{' '}
              {personalInfo.emergency_contact}
            </div>
          )}
          {personalInfo?.medical_conditions && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Health History:</span>{' '}
              {personalInfo.medical_conditions}
            </div>
          )}
        </div>

        {/* Documents */}
        {documents && documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Attached documents ({documents.length})
            </h4>
            <div className="space-y-1">
              {documents.map((doc: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <span>{doc.name || `Document ${index + 1}`}</span>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      ViewDocument
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {application.status === 'pending' && (
        <CardFooter className="flex gap-2">
          <Button
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="flex-1"
          >
            {isApproving ? (
              'Approving...'
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </>
            )}
          </Button>

          <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isApproving || isRejecting}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>RejectApplication</DialogTitle>
                <DialogDescription>
                  Please provide a rejection reason
                  This reason will beSubmitLet the candidate know.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Textarea
                  placeholder="Enter reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason('');
                  }}
                  disabled={isRejecting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                >
                  {isRejecting ? 'Rejecting...' : 'Confirm rejection'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      )}
    </Card>
  );
}
