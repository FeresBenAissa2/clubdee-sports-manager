'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { checkInWithQR } from '@/lib/activity/actions';
import { useToast } from '@/components/ui/toast';
import { Camera, Keyboard, Loader2, X, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCodeScannerProps {
  activityId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function QRCodeScanner({ activityId, onClose, onSuccess }: QRCodeScannerProps) {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [qrToken, setQrToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const { addToast } = useToast();
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  // Initialize QR scanner
  useEffect(() => {
    if (mode === 'scan' && !scanning && qrReaderRef.current) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [mode]);

  const startScanner = async () => {
    try {
      setCameraError(null);
      setScanning(true);

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR Code detected
          handleScan(decodedText);
        },
        (errorMessage) => {
          // Scanning error (can be ignored, happens frequently)
          console.debug('QR scan error:', errorMessage);
        }
      );
    } catch (error: any) {
      console.error('Failed to start scanner:', error);
      setCameraError(
        error?.message?.includes('NotAllowedError') || error?.message?.includes('Permission')
          ? 'Please allow camera access'
          : 'Could not open camera. Please try manual code entry instead'
      );
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (decodedText: string) => {
    if (loading) return;

    // Stop scanner immediately
    await stopScanner();

    setLoading(true);
    const result = await checkInWithQR(activityId, decodedText.trim());
    setLoading(false);

    if (result.error) {
      addToast({
        title: 'An error occurred',
        description: result.error,
        variant: 'error',
      });
      // Restart scanner on error
      if (mode === 'scan') {
        setTimeout(() => startScanner(), 1000);
      }
    } else {
      addToast({
        title: 'Check-in successful! 🎉',
        description: (result.data as any)?.status === 'on_time' 
          ? '✓ You are on time' 
          : '⚠ You are late',
        variant: 'success',
      });
      onSuccess();
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qrToken.trim()) {
      addToast({
        title: 'Please enter QR Code',
        description: 'Enter the code shown on the QR code.',
        variant: 'error',
      });
      return;
    }

    await handleScan(qrToken);
  };

  const switchMode = async (newMode: 'scan' | 'manual') => {
    if (newMode === mode) return;
    
    await stopScanner();
    setMode(newMode);
    setCameraError(null);
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Check in with QR Code
          </DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={mode === 'scan' ? 'default' : 'outline'}
            onClick={() => switchMode('scan')}
            disabled={loading}
            className="flex-1"
            size="sm"
          >
            <Camera className="w-4 h-4 mr-2" />
            Scan with camera
          </Button>
          <Button
            type="button"
            variant={mode === 'manual' ? 'default' : 'outline'}
            onClick={() => switchMode('manual')}
            disabled={loading}
            className="flex-1"
            size="sm"
          >
            <Keyboard className="w-4 h-4 mr-2" />
            Enter code
          </Button>
        </div>

        {/* Scanner Mode */}
        {mode === 'scan' && (
          <div className="space-y-4">
            {cameraError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 mb-1">Could not open camera</p>
                    <p className="text-xs text-red-700">{cameraError}</p>
                  </div>
                </div>
                <Button
                  onClick={() => switchMode('manual')}
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 border-red-300 hover:bg-red-50"
                >
                  Use manual code entry
                </Button>
              </div>
            ) : (
              <>
                <div 
                  id="qr-reader" 
                  ref={qrReaderRef}
                  className="rounded-xl overflow-hidden border-2 border-gray-200"
                  style={{ width: '100%' }}
                />
                
                {loading && (
                  <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-xl">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                      <p className="text-sm font-medium text-gray-900">Checking in...</p>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs text-blue-900 text-center">
                    📷 Point your camera at the QR code your coach displays
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                placeholder="Code from QR"
                disabled={loading}
                autoFocus
                className="text-center text-lg font-mono"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Enter the code from the QR code
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !qrToken.trim()}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking in...
                  </>
                ) : (
                  'Check in'
                )}
              </Button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-700 text-center">
                💡 Ask your coach to show the QR code, then enter the code here
              </p>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
