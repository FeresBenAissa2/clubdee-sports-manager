import { MobileLayout } from '@/components/layout/MobileLayout';
import { MobileCard, MobileHeader, MobileButton } from '@/components/ui/MobileCard';
import { Calendar, Trophy, TrendingUp, Bell } from 'lucide-react';

export default function AthleteMobileDashboard() {
  return (
    <MobileLayout role="athlete">
      <MobileHeader
        title="Hello, athlete!"
        subtitle="Ready to train today?"
        action={
          <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <MobileCard className="text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-gray-600">Training days</p>
          </MobileCard>
          
          <MobileCard className="text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
            <p className="text-2xl font-bold">5</p>
            <p className="text-xs text-gray-600">Awards</p>
          </MobileCard>
          
          <MobileCard className="text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold">85%</p>
            <p className="text-xs text-gray-600">Progress</p>
          </MobileCard>
        </div>

        {/* Today's Schedule */}
        <div>
          <h2 className="text-lg font-bold mb-3">Today's schedule</h2>
          <MobileCard className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-blue-600 font-bold">09:00</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold">Speed running practice</p>
                <p className="text-sm text-gray-600">Coach: Somchai</p>
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Upcoming
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <span className="text-gray-600 font-bold">14:00</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold">Strength training</p>
                <p className="text-sm text-gray-600">Coach: Somying</p>
              </div>
            </div>
          </MobileCard>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-bold mb-3">Quick menu</h2>
          <div className="grid grid-cols-2 gap-3">
            <MobileButton variant="primary" fullWidth>
              Check in
            </MobileButton>
            <MobileButton variant="outline" fullWidth>
              View training results
            </MobileButton>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-bold mb-3">Recent activities</h2>
          <MobileCard>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="font-medium">Training check-in</p>
                  <p className="text-sm text-gray-600">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="font-medium">Passed speed test</p>
                  <p className="text-sm text-gray-600">Yesterday</p>
                </div>
              </div>
            </div>
          </MobileCard>
        </div>
      </div>
    </MobileLayout>
  );
}
