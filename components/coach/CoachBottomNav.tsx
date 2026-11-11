'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Users, BarChart3, User } from 'lucide-react';

export function CoachBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard/coach',
      icon: Home,
      label: 'Home',
    },
    {
      href: '/dashboard/coach/sessions',
      icon: Calendar,
      label: 'Schedule',
    },
    {
      href: '/dashboard/coach/athletes',
      icon: Users,
      label: 'Athletes',
    },
    {
      href: '/dashboard/coach/performance',
      icon: BarChart3,
      label: 'Performance',
    },
    {
      href: '/dashboard/coach/profile',
      icon: User,
      label: 'Profile',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard/coach') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[60px] py-2 px-3 rounded-xl transition-all ${
                active
                  ? 'text-black'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                  active ? 'bg-black' : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? 'text-white' : 'text-current'}`}
                />
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  active ? 'text-black' : 'text-current'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
