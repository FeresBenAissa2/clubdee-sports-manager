'use client';

import { useSync } from '@/hooks/useSync';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SyncStatusIndicator() {
  const { syncStatus, pendingCount, manualSync } = useSync();

  if (syncStatus.status === 'idle' && pendingCount === 0) {
    return null;
  }

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'idle':
        return pendingCount > 0 ? (
          <CloudOff className="h-4 w-4 text-orange-500" />
        ) : (
          <Cloud className="h-4 w-4 text-blue-500" />
        );
    }
  };

  const getStatusText = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return `Syncing... ${syncStatus.progress || 0}%`;
      case 'success':
        return 'Synced successfully';
      case 'error':
        return syncStatus.error || 'Sync failed';
      case 'idle':
        return pendingCount > 0
          ? `${pendingCount} pending change${pendingCount > 1 ? 's' : ''}`
          : 'All synced';
    }
  };

  const getStatusColor = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'idle':
        return pendingCount > 0
          ? 'bg-orange-50 border-orange-200 text-orange-700'
          : 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div
      className={`fixed bottom-20 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm ${getStatusColor()}`}
    >
      {getStatusIcon()}
      <span className="text-sm font-medium">{getStatusText()}</span>
      {syncStatus.status === 'idle' && pendingCount > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={manualSync}
          className="h-6 px-2 text-xs"
        >
          Sync Now
        </Button>
      )}
      {syncStatus.status === 'error' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={manualSync}
          className="h-6 px-2 text-xs"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
