'use client';

import { User, LogOut } from 'lucide-react';
import { simpleSignOut } from '@/lib/auth/simple-actions';
import Link from 'next/link';

interface AthleteHeaderProps {
  firstName: string;
  lastName: string;
  nickname?: string;
  clubName?: string;
  profilePictureUrl?: string;
}

export default function AthleteHeader({
  firstName,
  lastName,
  nickname,
  clubName,
  profilePictureUrl,
}: AthleteHeaderProps) {
  const handleLogout = async () => {
    if (confirm('Sign out??')) {
      await simpleSignOut();
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/athlete" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt={`${firstName} ${lastName}`}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                Hello, {nickname || firstName}
              </h1>
              <p className="text-blue-100 text-xs">
                {clubName || 'Athlete'}
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-lg p-2 hover:bg-white/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
