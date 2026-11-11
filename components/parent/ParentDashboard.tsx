'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/db/client';
import { Users, TrendingUp, Calendar, Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parentLogout } from '@/lib/parent-auth/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ParentUser {
  id: string;
  email: string;
}

interface ParentDashboardProps {
  parentUser: ParentUser;
}

interface Athlete {
  athlete_id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  profile_picture_url?: string;
  club_name?: string;
  relationship: string;
  attendance_count_30d: number;
  total_sessions_30d: number;
  performance_records_count: number;
  active_goals_count: number;
  unread_notifications_count: number;
}

export function ParentDashboard({ parentUser }: ParentDashboardProps) {
  const router = useRouter();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    try {
      const db = createClient();
      
      const { data, error } = await db
        .from('parent_athlete_summary')
        .select('*')
        .eq('parent_user_id', parentUser.id);

      if (error) throw error;
      
      setAthletes(data || []);
    } catch (error) {
      console.error('Error loading athletes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await parentLogout();
    router.push('/parent/login');
    router.refresh();
  };

  const getAttendanceRate = (attended: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((attended / total) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Parent dashboard</h1>
              <p className="text-sm text-gray-600">{parentUser.email}</p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {athletes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No linked children yet
            </h2>
            <p className="text-gray-600 mb-6">
              Ask your child to add your email in the app
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600">Children</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{athletes.length}</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">Total attendance</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {athletes.reduce((sum, a) => sum + a.attendance_count_30d, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-600">Performance tests</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {athletes.reduce((sum, a) => sum + a.performance_records_count, 0)}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-sm text-gray-600">Notifications</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {athletes.reduce((sum, a) => sum + a.unread_notifications_count, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Unread</p>
              </div>
            </div>

            {/* Athletes List */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your children</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {athletes.map((athlete) => {
                  const attendanceRate = getAttendanceRate(
                    athlete.attendance_count_30d,
                    athlete.total_sessions_30d
                  );

                  return (
                    <Link
                      key={athlete.athlete_id}
                      href={`/parent/dashboard/athlete/${athlete.athlete_id}`}
                      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
                          {athlete.first_name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            {athlete.first_name} {athlete.last_name}
                          </h3>
                          {athlete.nickname && (
                            <p className="text-sm text-gray-600">({athlete.nickname})</p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">
                            {athlete.club_name || 'Not in a club yet'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Relationship: {athlete.relationship === 'father' ? 'Father' : athlete.relationship === 'mother' ? 'Mother' : 'Guardian'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Attendance rate</p>
                          <p className="text-lg font-bold text-gray-900">{attendanceRate}%</p>
                          <p className="text-xs text-gray-400">
                            {athlete.attendance_count_30d}/{athlete.total_sessions_30d}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Performance tests</p>
                          <p className="text-lg font-bold text-gray-900">
                            {athlete.performance_records_count}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Target</p>
                          <p className="text-lg font-bold text-gray-900">
                            {athlete.active_goals_count}
                          </p>
                        </div>
                      </div>

                      {athlete.unread_notifications_count > 0 && (
                        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
                          <Bell className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-orange-800">
                            New notifications {athlete.unread_notifications_count} items
                          </span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
