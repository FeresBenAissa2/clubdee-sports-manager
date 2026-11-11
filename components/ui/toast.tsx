'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
}

export type ToastActionElement = React.ReactElement;
export type ToastProps = Toast;

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed top-0 right-0 z-50 w-full max-w-md p-4 space-y-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const variantStyles = {
    default: 'bg-white border-gray-200',
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };

  const textStyles = {
    default: 'text-gray-900',
    success: 'text-green-900',
    error: 'text-red-900',
    warning: 'text-yellow-900',
  };

  const descriptionStyles = {
    default: 'text-gray-600',
    success: 'text-green-700',
    error: 'text-red-700',
    warning: 'text-yellow-700',
  };

  return (
    <div
      className={cn(
        'pointer-events-auto w-full rounded-lg border p-4 shadow-lg transition-all',
        'animate-in slide-in-from-top-5 duration-300',
        variantStyles[toast.variant || 'default']
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {toast.title && (
            <div className={cn('font-semibold', textStyles[toast.variant || 'default'])}>
              {toast.title}
            </div>
          )}
          {toast.description && (
            <div
              className={cn(
                'text-sm mt-1',
                descriptionStyles[toast.variant || 'default']
              )}
            >
              {toast.description}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className={cn(
            'rounded-md p-1 hover:bg-black/5 transition-colors',
            textStyles[toast.variant || 'default']
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
