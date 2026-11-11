'use client';

import { Calendar, Clock, TrendingUp, Users } from 'lucide-react';

interface SessionStatsProps {
  stats: {
    total: number;
    upcoming: number;
    past: number;
    thisWeek: number;
  };
}

export function SessionStats({ stats }: SessionStatsProps) {
  const statCards = [
    {
      label: 'All',
      value: stats.total,
      icon: Calendar,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      label: 'Upcoming',
      value: stats.upcoming,
      icon: Clock,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      label: 'This week',
      value: stats.thisWeek,
      icon: TrendingUp,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
    },
    {
      label: 'Past',
      value: stats.past,
      icon: Users,
      color: 'bg-gray-500',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${stat.textColor}`} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
