'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Download, Share, Plus, Smartphone, CheckCircle } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallPrompt() {
  const {
    installState,
    isStandalone,
    platform,
    canShowPrompt,
    canInstall,
    install,
    dismiss,
    getIOSInstructions,
  } = usePWAInstall();

  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Don't render if installed or dismissed
  if (installState === 'installed' || installState === 'dismissed' || isStandalone) {
    return null;
  }

  // Don't render if not available
  if (installState === 'idle' && platform !== 'ios') {
    return null;
  }

  const handleInstall = async () => {
    if (platform === 'ios') {
      setShowIOSGuide(true);
      return;
    }

    setIsInstalling(true);
    await install();
    setIsInstalling(false);
  };

  const iosInstructions = getIOSInstructions();

  // iOS Guide Modal
  if (showIOSGuide && iosInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
        <Card className="w-full max-w-md p-5 rounded-t-2xl animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-base">Add to home screen</h3>
            </div>
            <button
              onClick={() => {
                setShowIOSGuide(false);
                dismiss();
              }}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 mb-5">
            {iosInstructions.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm text-gray-700">{step}</p>
                  {index === 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <Share className="h-4 w-4" />
                      <span>The Share icon is at the bottom of Safari</span>
                    </div>
                  )}
                  {index === 1 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <Plus className="h-4 w-4" />
                      <span>Add to Home Screen</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={() => {
              setShowIOSGuide(false);
              dismiss();
            }}
            className="w-full"
          >
            Got it
          </Button>
        </Card>
      </div>
    );
  }

  // Main Install Prompt
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom">
      <Card className="p-4 shadow-xl border border-gray-200 bg-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Install app</h3>
              <p className="text-xs text-gray-500">Access faster</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Add Sports Club to your home screen for instant access and offline use.
        </p>

        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1"
            size="sm"
            disabled={isInstalling || (!canInstall && platform !== 'ios')}
          >
            {isInstalling ? (
              'Installing...'
            ) : platform === 'ios' ? (
              <>
                <Share className="h-4 w-4 mr-1" />
                How to install
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1" />
                Install
              </>
            )}
          </Button>
          <Button onClick={dismiss} variant="outline" size="sm">
            Later
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Compact version for header/navbar
export function PWAInstallButton() {
  const { installState, isStandalone, platform, canInstall, install, dismiss } = usePWAInstall();
  const [showTooltip, setShowTooltip] = useState(false);

  if (installState === 'installed' || isStandalone) {
    return (
      <div className="flex items-center gap-1 text-green-600 text-xs">
        <CheckCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Installed</span>
      </div>
    );
  }

  if (installState === 'dismissed' || (installState === 'idle' && platform !== 'ios')) {
    return null;
  }

  const handleClick = async () => {
    if (platform === 'ios') {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 5000);
      return;
    }
    await install();
  };

  return (
    <div className="relative">
      <Button
        onClick={handleClick}
        variant="outline"
        size="sm"
        className="gap-1"
        disabled={!canInstall && platform !== 'ios'}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Install</span>
      </Button>

      {showTooltip && platform === 'ios' && (
        <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
          <p className="mb-2 font-medium">How to install on iOS:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>Tap the Share button</li>
            <li>Select &quot;Add to Home Screen&quot;</li>
            <li>Tap &quot;Add&quot;</li>
          </ol>
          <button
            onClick={() => {
              setShowTooltip(false);
              dismiss();
            }}
            className="mt-2 text-blue-400 hover:text-blue-300"
          >
            Off
          </button>
        </div>
      )}
    </div>
  );
}
