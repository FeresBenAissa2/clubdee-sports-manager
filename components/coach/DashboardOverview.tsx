'use client';

import { DashboardStats } from '@/lib/coach/dashboard-actions';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  FileText,
  Trophy,
  UserCheck,
  Clock,
  AlertCircle
} from 'lucide-react';

interface DashboardOverviewProps {
  stats: DashboardStats;
}

export function DashboardOverview({ stats }: DashboardOverviewProps) {
  const statCards = [
    {
      title: 'All athletes',
      value: stats.totalAthletes,
      subtitle: `${stats.activeAthletes} recently active`,
      icon: Users,
      color: 'bg-blue-500',
      link: '/dashboard/coach/athletes',
    },
    {
      title: 'Training',
      value: stats.upcomingSessions,
      subtitle: `${stats.todaySessions} sessions today`,
      icon: Calendar,
      color: 'bg-green-500',
      link: '/dashboard/coach/sessions',
    },
    {
      title: 'Tournament',
      value: stats.activeTournaments,
      subtitle: `${stats.totalTournaments} total`,
      icon: Trophy,
      color: 'bg-yellow-500',
      link: '/dashboard/coach/tournaments',
    },
    {
      title: 'Test results',
      value: stats.recentPerformanceRecords,
      subtitle: 'in the last 7 days',
      icon: TrendingUp,
      color: 'bg-purple-500',
      link: '/dashboard/coach/performance',
    },
  ];

  const pendingTasks = [
    {
      title: 'Applications pending review',
      count: stats.pendingApplications,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      link: '/dashboard/coach/applications',
    },
    {
      title: 'Leave requests pending review',
      count: stats.pendingLeaveRequests,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/dashboard/coach/leave-requests',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <a
              key={index}
              href={stat.link}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-black mb-1">{stat.value}</p>
              <p className="text-xs font-medium text-gray-900 mb-1">{stat.title}</p>
              <p className="text-xs text-gray-500">{stat.subtitle}</p>
            </a>
          );
        })}
      </div>

      {/* Pending Tasks */}
      {(stats.pendingApplications > 0 || stats.pendingLeaveRequests > 0) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-black">Pending tasks</h3>
          </div>
          <div className="space-y-3">
            {pendingTasks.map((task, index) => {
              if (task.count === 0) return null;
              const Icon = task.icon;
              return (
                <a
                  key={index}
                  href={task.link}
                  className={`flex items-center justify-between p-3 ${task.bgColor} rounded-xl hover:opacity-80 transition-opacity`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${task.color}`} />
                    <span className="font-medium text-gray-900">{task.title}</span>
                  </div>
                  <span className={`text-lg font-bold ${task.color}`}>{task.count}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
