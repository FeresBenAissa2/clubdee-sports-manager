'use client';

import { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { simpleSignOut } from '@/lib/auth/simple-actions';

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MobileCard({ children, className = '', onClick }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 ${
        onClick ? 'active:scale-98 cursor-pointer' : ''
      } transition-transform ${className}`}
    >
      {children}
    </div>
  );
}

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function MobileHeader({ title, subtitle, action }: MobileHeaderProps) {
  const handleLogout = async () => {
    if (confirm('Do you want to sign out?')) {
      await simpleSignOut();
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-b-3xl shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-blue-100 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action && <div>{action}</div>}
          <button
            onClick={handleLogout}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors active:scale-95"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface MobileButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  disabled?: boolean;
}

export function MobileButton({
  children,
  onClick,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
}: MobileButtonProps) {
  const baseClasses = 'px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}
