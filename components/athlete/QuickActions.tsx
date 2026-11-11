'use client';

import Link from 'next/link';
import { User, Calendar, Activity, FileText, QrCode, LucideIcon } from 'lucide-react';

interface QuickActionProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  color,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
    >
      <Icon className={`mb-3 h-8 w-8 ${color}`} />
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </Link>
  );
}

export default function QuickActions() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <QuickActionCard
        href="/dashboard/athlete/activities"
        icon={QrCode}
        title="Activities"
        description="View activities and check in with QR"
        color="text-indigo-600"
      />
      <QuickActionCard
        href="/dashboard/athlete/profile"
        icon={User}
        title="Profile"
        description="View and edit personal information"
        color="text-blue-600"
      />
      <QuickActionCard
        href="/dashboard/athlete/attendance"
        icon={Calendar}
        title="Attendance history"
        description="View training attendance history"
        color="text-green-600"
      />
      <QuickActionCard
        href="/dashboard/athlete/performance"
        icon={Activity}
        title="Test results"
        description="View test results and progress"
        color="text-purple-600"
      />
      <QuickActionCard
        href="/dashboard/athlete/applications"
        icon={FileText}
        title="My applications"
        description="View membership application status"
        color="text-orange-600"
      />
    </div>
  );
}
