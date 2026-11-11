'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, Calendar, Clock, MapPin, Users, CheckCircle, XCircle, Eye } from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { RegistrationManagement } from './RegistrationManagement';
import { generateQRCode } from '@/lib/activity/actions';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';

interface Activity {
  id: string;
  title: string;
  description?: string;
  activity_type: string;
  activity_date: string;
  start_time: string;
  end_time: string;
  location: string;
  max_participants?: number;
  requires_registration: boolean;
  status: string;
  qr_code_token?: string;
  qr_code_expires_at?: string;
  activity_registrations?: Array<{
    id: string;
    status: string;
    athlete_id: string;
    athletes: {
      first_name: string;
      last_name: string;
    };
  }>;
  activity_checkins?: Array<{
    id: string;
    status: string;
    checked_in_at: string;
    athlete_id: string;
    athletes: {
      first_name: string;
      last_name: string;
    };
  }>;
}

const activityTypeLabels: Record<string, string> = {
  training: 'Training',
  competition: 'Race',
  practice: 'test',
  other: 'Other',
};

const activityTypeColors: Record<string, string> = {
  training: 'bg-blue-100 text-blue-800',
  competition: 'bg-red-100 text-red-800',
  practice: 'bg-green-100 text-green-800',
  other: 'bg-gray-100 text-gray-800',
};

export function CoachActivityList({ activities }: { activities: Activity[] }) {
  const [showQR, setShowQR] = useState<string | null>(null);
  const [showRegistrations, setShowRegistrations] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const { addToast } = useToast();
  const router = useRouter();

  const handleGenerateQR = async (activityId: string) => {
    setLoading(activityId);
    const result = await generateQRCode(activityId);
    setLoading(null);

    if (result.error) {
      addToast({
        title: 'An error occurred',
        description: result.error,
        variant: 'error',
      });
    } else {
      addToast({
        title: 'Create QR Code Success',
        description: 'QR code is ready',
        variant: 'success',
      });
      setShowQR(activityId);
      router.refresh();
    }
  };

  const getPendingCount = (activity: Activity) => {
    return activity.activity_registrations?.filter(r => r.status === 'pending').length || 0;
  };

  const getApprovedCount = (activity: Activity) => {
    return activity.activity_registrations?.filter(r => r.status === 'approved').length || 0;
  };

  const getCheckinCount = (activity: Activity) => {
    return activity.activity_checkins?.length || 0;
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">"Not have activity yet": "",</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {activities.map((activity) => {
          const pendingCount = getPendingCount(activity);
          const approvedCount = getApprovedCount(activity);
          const checkinCount = getCheckinCount(activity);
          const qrToken = activity.qr_code_token;

          return (
            <Card key={activity.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold">{activity.title}</h3>
                    <Badge className={activityTypeColors[activity.activity_type]}>
                      {activityTypeLabels[activity.activity_type]}
                    </Badge>
                    {activity.requires_registration && (
                      <Badge variant="outline">toRegister</Badge>
                    )}
                  </div>

                  {activity.description && (
                    <p className="text-gray-600 mb-4">{activity.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(activity.activity_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      {activity.start_time} - {activity.end_time}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {activity.location}
                    </div>
                    {activity.max_participants && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        Ltd. {activity.max_participants} people
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm">
                    {activity.requires_registration && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Pending approval:</span>
                          <Badge variant={pendingCount > 0 ? 'default' : 'secondary'}>
                            {pendingCount}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Approved:</span>
                          <Badge className="bg-green-100 text-green-800">
                            {approvedCount}
                          </Badge>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Checked-in:</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {checkinCount}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex flex-col gap-2">
                  {qrToken ? (
                    <Button onClick={() => setShowQR(activity.id)}>
                      <QrCode className="w-4 h-4 mr-2" />
                      Showing QR
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleGenerateQR(activity.id)}
                      disabled={loading === activity.id}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Create QR
                    </Button>
                  )}

                  {activity.requires_registration && (
                    <Button
                      variant="outline"
                      onClick={() => setShowRegistrations(activity.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      ActionsRegister
                      {pendingCount > 0 && (
                        <Badge className="ml-2 bg-red-500">{pendingCount}</Badge>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showQR && (
        <QRCodeDisplay
          activity={activities.find(a => a.id === showQR)!}
          onClose={() => setShowQR(null)}
        />
      )}

      {showRegistrations && (
        <RegistrationManagement
          activity={activities.find(a => a.id === showRegistrations) as any}
          onClose={() => {
            setShowRegistrations(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
