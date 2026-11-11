'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface Activity {
  id: string;
  title: string;
  qr_code_token?: string;
  qr_code_expires_at?: string;
  activity_date: string;
  start_time: string;
}

export function QRCodeDisplay({ activity, onClose }: { activity: Activity; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const { addToast } = useToast();

  useEffect(() => {
    if (activity.qr_code_token) {
      QRCode.toDataURL(activity.qr_code_token, {
        width: 400,
        margin: 2,
      }).then(setQrDataUrl);
    }
  }, [activity.qr_code_token]);

  const handleCopyToken = () => {
    if (activity.qr_code_token) {
      navigator.clipboard.writeText(activity.qr_code_token);
      addToast({
        title: 'Copied',
        description: 'QR code copied',
        variant: 'success',
      });
    }
  };

  const handleDownload = () => {
    if (qrDataUrl) {
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `qr-${activity.title}-${activity.activity_date}.png`;
      link.click();
      addToast({
        title: 'Download successful',
        description: 'QR code downloaded',
        variant: 'success',
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{activity.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {qrDataUrl && (
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <img src={qrDataUrl} alt="QR Code" className="w-full max-w-sm" />
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Date:</span>{' '}
              {new Date(activity.activity_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="text-sm">
              <span className="font-medium">Time:</span> {activity.start_time}
            </div>
            {activity.qr_code_expires_at && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Expires:</span>{' '}
                {new Date(activity.qr_code_expires_at).toLocaleString('en-US')}
              </div>
            )}
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">QR code:</div>
            <div className="text-sm font-mono break-all">{activity.qr_code_token}</div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopyToken} className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              Copy code
            </Button>
            <Button variant="outline" onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>How to use:</strong>
            </p>
            <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
              <li>Showing QR Code This givesAthletesScan</li>
              <li>Or share your code with them.AthletesEnter manually</li>
              <li>AthletesSaPresentCar can be checked in withinTimeAssigned</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
