'use client';

import { useEffect, useState } from 'react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscription,
  savePushSubscription,
  removePushSubscription,
} from '@/lib/utils/push-notifications';

interface UsePushNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  error: Error | null;
}

/**
 * Hook for managing push notification subscriptions
 */
export function usePushNotifications(userId?: string): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = isPushNotificationSupported();
    setIsSupported(supported);

    if (!supported) {
      setIsLoading(false);
      return;
    }

    // Get current permission status
    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    // Check if already subscribed
    const checkSubscription = async () => {
      try {
        const subscription = await getPushSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Failed to check subscription:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, []);

  const subscribe = async () => {
    if (!userId) {
      setError(new Error('User ID is required'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const subscription = await subscribeToPushNotifications();
      
      if (subscription) {
        // Save subscription to server
        await savePushSubscription(subscription, userId);
        setIsSubscribed(true);
        setPermission('granted');
      } else {
        setError(new Error('Failed to subscribe to push notifications'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to subscribe'));
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!userId) {
      setError(new Error('User ID is required'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await unsubscribeFromPushNotifications();
      
      if (success) {
        // Remove subscription from server
        await removePushSubscription(userId);
        setIsSubscribed(false);
      } else {
        setError(new Error('Failed to unsubscribe from push notifications'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to unsubscribe'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    error,
  };
}
