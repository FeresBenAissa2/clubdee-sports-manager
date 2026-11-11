'use client';

import { useState, useEffect } from 'react';
import {
  getParentConnections,
  removeParentConnection,
  resendVerificationEmail,
  type ParentConnection,
} from '@/lib/parent/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Mail, Phone, CheckCircle, XCircle, Trash2, Send, Settings } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { NotificationPreferencesDialog } from './NotificationPreferencesDialog';

export function ParentConnectionList() {
  const [connections, setConnections] = useState<ParentConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const data = await getParentConnections();
      setConnections(data);
    } catch (error) {
      toast({
        title: 'An error occurred',
        description: 'Could not load parent data',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      const result = await resendVerificationEmail(connectionId);
      
      if (result.success) {
        toast({
          title: 'Email sent',
          description: result.message,
        });
      } else {
        toast({
          title: 'An error occurred',
          description: result.error,
          variant: 'error',
        });
      }
    } catch (error) {
      toast({
        title: 'An error occurred',
        description: 'Could not send email',
        variant: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      const result = await removeParentConnection(connectionId);
      
      if (result.success) {
        toast({
          title: 'Deleted successfully',
          description: result.message,
        });
        loadConnections();
      } else {
        toast({
          title: 'An error occurred',
          description: result.error,
          variant: 'error',
        });
      }
    } catch (error) {
      toast({
        title: 'An error occurred',
        description: 'Could not remove parent',
        variant: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getRelationshipLabel = (relationship: string) => {
    switch (relationship) {
      case 'father':
        return 'Father';
      case 'mother':
        return 'Mother';
      case 'guardian':
        return 'Parent';
      default:
        return relationship;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parent</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (connections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parent</CardTitle>
          <CardDescription>
            No parents connected yet Click the button "Add parent" To add a parent
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {connections.map((connection) => (
        <Card key={connection.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{connection.parent_name}</CardTitle>
                  {connection.is_verified ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Confirmed
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="w-3 h-3 mr-1" />
                      Pending confirmation
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {getRelationshipLabel(connection.relationship)}
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <NotificationPreferencesDialog
                  connection={connection}
                  onUpdate={loadConnections}
                />
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={actionLoading === connection.id}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm delete</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remove this parent connection?? 
                        The parent will no longer receive notifications
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemove(connection.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{connection.parent_email}</span>
            </div>
            
            {connection.phone_number && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{connection.phone_number}</span>
              </div>
            )}
            
            {!connection.is_verified && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResendVerification(connection.id)}
                  disabled={actionLoading === connection.id}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Resend confirmation email
                </Button>
              </div>
            )}
            
            {connection.is_verified && (
              <div className="pt-2 space-y-2">
                <p className="text-xs text-gray-500">Notifications:</p>
                <div className="flex flex-wrap gap-2">
                  {connection.notify_attendance && (
                    <Badge variant="outline" className="text-xs">Attendance</Badge>
                  )}
                  {connection.notify_performance && (
                    <Badge variant="outline" className="text-xs">Test results</Badge>
                  )}
                  {connection.notify_leave_requests && (
                    <Badge variant="outline" className="text-xs">Leave</Badge>
                  )}
                  {connection.notify_announcements && (
                    <Badge variant="outline" className="text-xs">Announcement</Badge>
                  )}
                  {connection.notify_goals && (
                    <Badge variant="outline" className="text-xs">Goals</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Frequency: {connection.notification_frequency === 'immediate' ? 'Immediately' : 
                           connection.notification_frequency === 'daily' ? 'Daily' : 'Weekly'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
