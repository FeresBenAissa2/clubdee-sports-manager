'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, User, Calendar, Settings, Users, BarChart3 } from 'lucide-react';

interface MobileLayoutProps {
  children: ReactNode;
  role: 'admin' | 'coach' | 'athlete';
}

const navigationConfig = {
  admin: [
    { href: '/dashboard/admin', icon: Home, label: 'Home' },
    { href: '/dashboard/admin/users', icon: Users, label: 'Users' },
    { href: '/dashboard/admin/reports', icon: BarChart3, label: 'Report' },
    { href: '/dashboard/admin/settings', icon: Settings, label: 'Settings' },
  ],
  coach: [
    { href: '/dashboard/coach', icon: Home, label: 'Home' },
    { href: '/dashboard/coach/athletes', icon: Users, label: 'Athletes' },
    { href: '/dashboard/coach/schedule', icon: Calendar, label: 'Schedule' },
    { href: '/dashboard/coach/profile', icon: User, label: 'Profile' },
  ],
  athlete: [
    { href: '/dashboard/athlete', icon: Home, label: 'Home' },
    { href: '/dashboard/athlete/schedule', icon: Calendar, label: 'Schedule' },
    { href: '/dashboard/athlete/profile', icon: User, label: 'Profile' },
    { href: '/dashboard/athlete/settings', icon: Settings, label: 'Settings' },
  ],
};

export function MobileLayout({ children, role }: MobileLayoutProps) {
  const pathname = usePathname();
  const navigation = navigationConfig[role];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main Content */}
      <main className="max-w-md mx-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="max-w-md mx-auto px-2 py-2">
          <div className="flex justify-around items-center">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-1 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
