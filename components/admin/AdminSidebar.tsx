'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  UserCog,
  Users,
  FileText,
  Settings,
  LogOut,
  Calendar,
  ClipboardCheck,
} from 'lucide-react';
import { signOut } from '@/lib/auth/actions';

const navigation = [
  { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { name: 'Clubs', href: '/dashboard/admin/clubs', icon: Building2 },
  { name: 'Coaches', href: '/dashboard/admin/coaches', icon: UserCog },
  { name: 'Athletes', href: '/dashboard/admin/athletes', icon: Users },
  { name: 'Sessions', href: '/dashboard/admin/sessions', icon: Calendar },
  { name: 'Attendance', href: '/dashboard/admin/attendance', icon: ClipboardCheck },
  { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
  { name: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">Admin Panel</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="border-t border-gray-800 p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
