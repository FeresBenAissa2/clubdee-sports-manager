'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { QrCode, Calendar, Clock, MapPin, Users, CheckCircle, XCircle, Search, Filter, Info } from 'lucide-react';
import { QRCodeScanner } from './QRCodeScanner';
import { registerForActivity, cancelRegistration } from '@/lib/activity/actions';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  registration_deadline?: string;
  status: string;
  coaches?: {
    first_name: string;
    last_name: string;
  };
  activity_registrations?: Array<{
    id: string;
    status: string;
    athlete_id: string;
  }>;
  activity_checkins?: Array<{
    id: string;
    status: string;
    checked_in_at: string;
    checked_out_at?: string;
    athlete_id: string;
  }>;
}

interface Registration {
  id: string;
  status: string;
  athlete_notes?: string;
  coach_notes?: string;
  rejection_reason?: string;
  registered_at: string;
}

interface ActivityListProps {
  activities: Activity[];
  athleteId: string;
  registrations?: Registration[];
  type: 'upcoming' | 'registrations' | 'past';
}

const activityTypeLabels: Record<string, string> = {
  training: 'Training',
  competition: 'Competition',
  practice: 'Test',
  other: 'Other',
};

const activityTypeColors: Record<string, string> = {
  training: 'bg-white text-black border border-gray-300',
  competition: 'bg-black text-white border border-black',
  practice: 'bg-white text-black border border-black',
  other: 'bg-gray-100 text-black border border-gray-300',
};

const registrationStatusLabels: Record<string, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Not approved',
  cancelled: 'Cancelled',
};

const registrationStatusColors: Record<string, string> = {
  pending: 'bg-white text-black border border-gray-400',
  approved: 'bg-black text-white border border-black',
  rejected: 'bg-gray-100 text-gray-600 border border-gray-300',
  cancelled: 'bg-gray-50 text-gray-500 border border-gray-200',
};

// Helper function to calculate duration
function calculateDuration(startTime: string, endTime: string): string {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const durationMinutes = endMinutes - startMinutes;
  
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (hours > 0 && minutes > 0) {
    return `${hours} h ${minutes} min`;
  } else if (hours > 0) {
    return `${hours} hours`;
  } else {
    return `${minutes} min`;
  }
}

/**
 * Helper function to calculate remaining time until deadline
 * **Validates: Requirements 3.3** - Deadline display
 */
function calculateRemainingTime(deadline: string | null | undefined): {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
  displayText: string;
} | null {
  if (!deadline) {
    return null;
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      isExpired: true,
      displayText: 'Registration period has ended',
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let displayText = '';
  if (days > 0) {
    displayText = `Registration time remaining ${days} days`;
  } else if (hours > 0) {
    displayText = `Registration time remaining ${hours} hours`;
  } else {
    displayText = `Registration time remaining ${minutes} min`;
  }

  return {
    days,
    hours,
    minutes,
    isExpired: false,
    displayText,
  };
}

export function ActivityList({ activities, athleteId, registrations, type }: ActivityListProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const { addToast } = useToast();
  const router = useRouter();

  // Filter and search activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.activity_type === filterType);
    }

    // Search by title, description, or location
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.location.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activities, filterType, searchQuery]);

  const handleRegister = async (activityId: string) => {
    setLoading(activityId);
    const result = await registerForActivity(activityId);
    setLoading(null);

    if (result.error) {
      addToast({
        title: 'An error occurred',
        description: result.error,
        variant: 'error',
      });
    } else {
      addToast({
        title: 'Registered successfully',
        description: 'Awaiting coach approval',
        variant: 'success',
      });
      router.refresh();
    }
  };

  const handleCancelRegistration = async (registrationId: string) => {
    setLoading(registrationId);
    const result = await cancelRegistration(registrationId);
    setLoading(null);

    if (result.error) {
      addToast({
        title: 'An error occurred',
        description: result.error,
        variant: 'error',
      });
    } else {
      addToast({
        title: 'Cancelled successfully',
        description: 'Registration cancelled successfully',
        variant: 'success',
      });
      router.refresh();
    }
  };

  const handleScanQR = (activityId: string) => {
    setSelectedActivity(activityId);
    setShowScanner(true);
  };

  const getMyRegistration = (activity: Activity) => {
    return activity.activity_registrations?.find(r => r.athlete_id === athleteId);
  };

  const getMyCheckin = (activity: Activity) => {
    return activity.activity_checkins?.find(c => c.athlete_id === athleteId);
  };

  const emptyMessages = {
    upcoming: {
      title: 'No upcoming activities',
      description: 'No new activities at the moment',
    },
    registrations: {
      title: 'No registrations yet',
      description: 'You have not registered for any activities',
    },
    past: {
      title: 'No past activities',
      description: 'No activity history yet',
    },
  };

  if (activities.length === 0) {
    const message = emptyMessages[type];

    return (
      <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
        <h3 className="text-base font-semibold text-black mb-1">{message.title}</h3>
        <p className="text-sm text-gray-600">{message.description}</p>
      </div>
    );
  }

  return (
    <>
      {/* Minimal search and filter */}
      {activities.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-300"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full bg-white border-gray-300">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="competition">Competition</SelectItem>
              <SelectItem value="practice">Test</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Results count */}
      {filteredActivities.length !== activities.length && (
        <div className="mb-3 text-xs text-gray-500">
          {filteredActivities.length} / {activities.length}
        </div>
      )}

      {/* Empty search results */}
      {filteredActivities.length === 0 && activities.length > 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-black mb-1">No activities found</h3>
          <p className="text-xs text-gray-600">Try a different search term</p>
        </div>
      )}

      <div className="space-y-3">
        {filteredActivities.map((activity) => {
          const myRegistration = getMyRegistration(activity);
          const myCheckin = getMyCheckin(activity);
          const registration = registrations?.find(r => 
            r.id === myRegistration?.id
          );

          // Calculate days until activity
          const daysUntil = Math.ceil(
            (new Date(activity.activity_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          const isToday = daysUntil === 0;
          const isTomorrow = daysUntil === 1;
          
          // Calculate remaining time until registration deadline
          const deadlineInfo = calculateRemainingTime(activity.registration_deadline);

          return (
            <Card key={activity.id} className="p-4 border border-gray-300 hover:border-black transition-colors">
              <div>
                {/* Minimal Header */}
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-black text-base flex-1">{activity.title}</h3>
                    {isToday && !myCheckin && (
                      <span className="text-xs font-bold">Today</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className={`${activityTypeColors[activity.activity_type]} text-xs`}>
                      {activityTypeLabels[activity.activity_type]}
                    </Badge>
                    {myRegistration && (
                      <Badge className={`${registrationStatusColors[myRegistration.status]} text-xs`}>
                        {registrationStatusLabels[myRegistration.status]}
                      </Badge>
                    )}
                    {myCheckin && (
                      <Badge className="bg-black text-white text-xs">
                        Checked in
                      </Badge>
                    )}
                  </div>
                </div>

                {activity.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{activity.description}</p>
                )}

                {/* Minimal Details */}
                <div className="space-y-1.5 mb-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {new Date(activity.activity_date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {daysUntil > 0 && daysUntil <= 7 && (
                        <span className="text-gray-500 ml-2">({daysUntil} days)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{activity.start_time} - {activity.end_time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{activity.location}</span>
                  </div>
                  {activity.coaches && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span>Coach {activity.coaches.first_name}</span>
                    </div>
                  )}
                </div>

                {/* Enhanced check-in status display */}
                {/* **Validates: Requirements 3.5** - Check-in status display */}
                {myCheckin && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-300 rounded">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <span className="font-bold text-green-700">
                          Checked in
                        </span>
                        <span className="text-green-600 ml-2">
                          ({myCheckin.status === 'on_time' ? 'On time' : 'Late'})
                        </span>
                      </div>
                      <span className="text-xs text-green-600">
                        {new Date(myCheckin.checked_in_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Registration deadline display */}
                {/* **Validates: Requirements 3.3** - Deadline display */}
                {type === 'upcoming' && activity.requires_registration && deadlineInfo && !myCheckin && !myRegistration && (
                  <div className={`mb-3 p-2 rounded text-xs ${
                    deadlineInfo.isExpired 
                      ? 'bg-red-50 border border-red-200 text-red-600' 
                      : deadlineInfo.days === 0 
                        ? 'bg-orange-50 border border-orange-200 text-orange-600'
                        : 'bg-blue-50 border border-blue-200 text-blue-600'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{deadlineInfo.displayText}</span>
                    </div>
                  </div>
                )}

                {/* Rejection reason */}
                {registration && registration.rejection_reason && (
                  <div className="mb-3 p-3 bg-gray-50 border border-gray-300 rounded">
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">Reason: </span>
                      {registration.rejection_reason}
                    </div>
                  </div>
                )}

                {/* Coach notes */}
                {registration && registration.coach_notes && registration.status === 'approved' && (
                  <div className="mb-3 p-3 bg-gray-50 border border-gray-300 rounded">
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">Coach: </span>
                      {registration.coach_notes}
                    </div>
                  </div>
                )}

                {/* Minimal Action buttons */}
                {type === 'upcoming' && !myCheckin && (
                  <div className="flex gap-2 pt-2 border-t border-gray-200 mt-3">
                    {activity.requires_registration ? (
                      <>
                        {!myRegistration && (
                          <Button
                            onClick={() => handleRegister(activity.id)}
                            disabled={loading === activity.id}
                            size="sm"
                            className="flex-1 bg-black hover:bg-gray-800 text-white"
                          >
                            {loading === activity.id ? 'Registering...' : 'Register'}
                          </Button>
                        )}
                        {myRegistration?.status === 'pending' && (
                          <Button
                            variant="outline"
                            onClick={() => handleCancelRegistration(myRegistration.id)}
                            disabled={loading === myRegistration.id}
                            size="sm"
                            className="flex-1 border-gray-300"
                          >
                            {loading === myRegistration.id ? 'Cancelling...' : 'Cancel'}
                          </Button>
                        )}
                        {myRegistration?.status === 'approved' && (
                          <Button 
                            onClick={() => handleScanQR(activity.id)}
                            size="sm"
                            className="flex-1 bg-black hover:bg-gray-800 text-white"
                          >
                            <QrCode className="w-4 h-4 mr-2" />
                            Scan QR
                          </Button>
                        )}
                        {myRegistration?.status === 'rejected' && (
                          <div className="flex-1 text-center py-2 text-xs text-gray-500">
                            Not approved
                          </div>
                        )}
                      </>
                    ) : (
                      <Button 
                        onClick={() => handleScanQR(activity.id)}
                        size="sm"
                        className="flex-1 bg-black hover:bg-gray-800 text-white"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Scan QR
                      </Button>
                    )}
                  </div>
                )}

                {/* Registration timestamp */}
                {type === 'registrations' && registration && (
                  <div className="pt-2 border-t border-gray-200 mt-3">
                    <div className="text-xs text-gray-500">
                      {new Date(registration.registered_at).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {showScanner && selectedActivity && (
        <QRCodeScanner
          activityId={selectedActivity}
          onClose={() => {
            setShowScanner(false);
            setSelectedActivity(null);
          }}
          onSuccess={() => {
            setShowScanner(false);
            setSelectedActivity(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
