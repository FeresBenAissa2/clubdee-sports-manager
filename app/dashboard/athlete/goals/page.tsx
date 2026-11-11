import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ArrowLeft, Target, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function AthleteGoalsPage() {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get athlete profile
  const { data: athlete } = (await db
    .from('athletes')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .single()) as { data: any };

  if (!athlete) {
    redirect('/dashboard/athlete');
  }

  // Get all goals
  const { data: goals } = await db
    .from('athlete_goals')
    .select(
      `
      *,
      coaches (
        first_name,
        last_name
      )
    `
    )
    .eq('athlete_id', athlete.id)
    .order('created_at', { ascending: false });

  const activeGoals = (goals || []).filter((g: any) => g.status === 'active');
  const completedGoals = (goals || []).filter((g: any) => g.status === 'completed');
  const overdueGoals = (goals || []).filter((g: any) => g.status === 'overdue');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'overdue':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700',
    };
    const labels = {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${colors[priority as keyof typeof colors]}`}
      >
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/athlete"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-black" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-black">My goals</h1>
              <p className="text-xs text-gray-500">
                Track your progress
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{activeGoals.length}</p>
            <p className="text-xs text-blue-600">In progress</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {completedGoals.length}
            </p>
            <p className="text-xs text-green-600">Completed</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{overdueGoals.length}</p>
            <p className="text-xs text-red-600">Overdue</p>
          </div>
        </div>

        {/* Goals List */}
        {goals && goals.length > 0 ? (
          <div className="space-y-4">
            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  In progress ({activeGoals.length})
                </h2>
                <div className="space-y-3">
                  {activeGoals.map((goal: any) => (
                    <div
                      key={goal.id}
                      className={`border-2 rounded-xl p-4 ${getStatusColor(goal.status)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-2 flex-1">
                          {getStatusIcon(goal.status)}
                          <div className="flex-1">
                            <h4 className="font-semibold text-black text-sm">
                              {goal.title}
                            </h4>
                            {goal.description && (
                              <p className="text-xs text-gray-600 mt-1">
                                {goal.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Coach {goal.coaches?.first_name} {goal.coaches?.last_name}
                            </p>
                          </div>
                        </div>
                        {getPriorityBadge(goal.priority)}
                      </div>

                      {goal.target_value && (
                        <div className="text-xs text-gray-600 mb-2">
                          Goals: {goal.target_value} {goal.target_unit}
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span className="font-semibold">
                            {goal.progress_percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-600 transition-all"
                            style={{
                              width: `${Math.min(goal.progress_percentage, 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                        <span>
                          Start: {new Date(goal.start_date).toLocaleDateString('en-US')}
                        </span>
                        <span>
                          Goals:{' '}
                          {new Date(goal.target_date).toLocaleDateString('en-US')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue Goals */}
            {overdueGoals.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-red-700 mb-3">
                  Overdue ({overdueGoals.length})
                </h2>
                <div className="space-y-3">
                  {overdueGoals.map((goal: any) => (
                    <div
                      key={goal.id}
                      className={`border-2 rounded-xl p-4 ${getStatusColor(goal.status)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-2 flex-1">
                          {getStatusIcon(goal.status)}
                          <div className="flex-1">
                            <h4 className="font-semibold text-black text-sm">
                              {goal.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              Coach {goal.coaches?.first_name} {goal.coaches?.last_name}
                            </p>
                          </div>
                        </div>
                        {getPriorityBadge(goal.priority)}
                      </div>

                      <div className="text-xs text-red-600 mb-2">
                        Overdue:{' '}
                        {new Date(goal.target_date).toLocaleDateString('en-US')}
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-red-600 transition-all"
                          style={{
                            width: `${Math.min(goal.progress_percentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-green-700 mb-3">
                  Completed ({completedGoals.length})
                </h2>
                <div className="space-y-3">
                  {completedGoals.map((goal: any) => (
                    <div
                      key={goal.id}
                      className={`border-2 rounded-xl p-4 ${getStatusColor(goal.status)}`}
                    >
                      <div className="flex items-start gap-2">
                        {getStatusIcon(goal.status)}
                        <div className="flex-1">
                          <h4 className="font-semibold text-black text-sm">
                            {goal.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            Coach {goal.coaches?.first_name} {goal.coaches?.last_name}
                          </p>
                          {goal.completed_at && (
                            <p className="text-xs text-green-600 mt-2">
                              ✓ Completed on:{' '}
                              {new Date(goal.completed_at).toLocaleDateString('en-US')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No goals yet
            </h3>
            <p className="text-sm text-gray-600">
              Your coach will set goals to track your progress
            </p>
          </div>
        )}
      </div>

      {/* Bottom spacing */}
      <div className="h-24"></div>
    </div>
  );
}
