'use client';

import { 
  Calendar, 
  UserPlus, 
  ClipboardList, 
  Trophy,
  Bell,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

export function QuickActionsGrid() {
  const quickActions = [
    {
      title: 'Create training',
      description: 'Add a new session',
      icon: Calendar,
      href: '/dashboard/coach/sessions',
      color: 'bg-blue-500',
    },
    {
      title: 'Take attendance',
      description: 'Record attendance',
      icon: ClipboardList,
      href: '/dashboard/coach/attendance',
      color: 'bg-green-500',
    },
    {
      title: 'Record test results',
      description: 'Add test results',
      icon: BarChart3,
      href: '/dashboard/coach/performance',
      color: 'bg-purple-500',
    },
    {
      title: 'Create announcement',
      description: 'Post new update',
      icon: Bell,
      href: '/dashboard/coach/announcements',
      color: 'bg-orange-500',
    },
    {
      title: 'Create tournament',
      description: 'Manage competition',
      icon: Trophy,
      href: '/dashboard/coach/tournaments',
      color: 'bg-yellow-500',
    },
    {
      title: 'Manage athletes',
      description: 'View full list',
      icon: UserPlus,
      href: '/dashboard/coach/athletes',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {quickActions.map((action, index) => {
        const Icon = action.icon;
        return (
          <Link
            key={index}
            href={action.href}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center mb-3`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-black text-sm mb-1">{action.title}</h3>
            <p className="text-xs text-gray-500">{action.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
