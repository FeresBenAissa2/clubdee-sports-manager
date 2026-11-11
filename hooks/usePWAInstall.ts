'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallState = 'idle' | 'available' | 'installed' | 'dismissed';

const STORAGE_KEYS = {
  INSTALLED: 'pwa-installed',
  DISMISSED: 'pwa-install-dismissed',
  DISMISS_COUNT: 'pwa-dismiss-count',
} as const;

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');

  // Detect platform
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  // Check if running as standalone (installed)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(isStandaloneMode);

      if (isStandaloneMode) {
        // Mark as installed
        localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
        setInstallState('installed');
      }
    };

    checkStandalone();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
        setInstallState('installed');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Check if already installed from storage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wasInstalled = localStorage.getItem(STORAGE_KEYS.INSTALLED) === 'true';
    if (wasInstalled || isStandalone) {
      setInstallState('installed');
      return;
    }

    // Check if dismissed and should stay hidden
    const dismissedTime = localStorage.getItem(STORAGE_KEYS.DISMISSED);
    const dismissCount = parseInt(localStorage.getItem(STORAGE_KEYS.DISMISS_COUNT) || '0', 10);

    if (dismissedTime) {
      const dismissedAt = parseInt(dismissedTime, 10);
      // Increase delay based on dismiss count: 1 day, 7 days, 30 days, permanent
      const delays = [1, 7, 30, Infinity];
      const delayDays = delays[Math.min(dismissCount, delays.length - 1)];
      const delayMs = delayDays * 24 * 60 * 60 * 1000;

      if (Date.now() - dismissedAt < delayMs) {
        setInstallState('dismissed');
      }
    }
  }, [isStandalone]);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (installState === 'installed') return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Only show if not dismissed or installed
      if (installState !== 'dismissed') {
        setInstallState('available');
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
      localStorage.removeItem(STORAGE_KEYS.DISMISSED);
      localStorage.removeItem(STORAGE_KEYS.DISMISS_COUNT);
      setInstallState('installed');
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [installState]);

  // Install function
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
        localStorage.removeItem(STORAGE_KEYS.DISMISSED);
        localStorage.removeItem(STORAGE_KEYS.DISMISS_COUNT);
        setInstallState('installed');
        setDeferredPrompt(null);
        return true;
      } else {
        // User dismissed the native prompt
        dismiss();
        return false;
      }
    } catch (error) {
      console.error('Error during PWA install:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Dismiss function with progressive delay
  const dismiss = useCallback(() => {
    const currentCount = parseInt(localStorage.getItem(STORAGE_KEYS.DISMISS_COUNT) || '0', 10);
    localStorage.setItem(STORAGE_KEYS.DISMISSED, Date.now().toString());
    localStorage.setItem(STORAGE_KEYS.DISMISS_COUNT, (currentCount + 1).toString());
    setInstallState('dismissed');
  }, []);

  // Reset dismiss state (for testing or settings)
  const resetDismiss = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.DISMISSED);
    localStorage.removeItem(STORAGE_KEYS.DISMISS_COUNT);
    if (deferredPrompt) {
      setInstallState('available');
    } else {
      setInstallState('idle');
    }
  }, [deferredPrompt]);

  // Check if can show prompt
  const canShowPrompt = installState === 'available' && !isStandalone;

  // Get iOS install instructions
  const getIOSInstructions = () => {
    if (platform !== 'ios') return null;
    return {
      steps: [
        'Tap the Share button (box with upward arrow)',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" in the top-right corner',
      ],
    };
  };

  return {
    installState,
    isStandalone,
    platform,
    canShowPrompt,
    canInstall: !!deferredPrompt,
    install,
    dismiss,
    resetDismiss,
    getIOSInstructions,
  };
}
