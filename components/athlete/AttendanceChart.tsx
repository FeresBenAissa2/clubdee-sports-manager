'use client';

interface AttendanceDataPoint {
  status: string;
  check_in_time: string | null;
  training_sessions: {
    session_date: string;
  };
}

interface AttendanceChartProps {
  data: AttendanceDataPoint[];
}

export default function AttendanceChart({ data }: AttendanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No training attendance data for this period
      </div>
    );
  }

  // Count by status
  const statusCounts = data.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = data.length;
  const present = statusCounts.present || 0;
  const late = statusCounts.late || 0;
  const absent = statusCounts.absent || 0;
  const excused = statusCounts.excused || 0;

  const statusConfig = [
    { key: 'present', label: 'Attended', color: 'bg-green-500', count: present },
    { key: 'late', label: 'Late', color: 'bg-yellow-500', count: late },
    { key: 'excused', label: 'Sick leave', color: 'bg-blue-500', count: excused },
    { key: 'absent', label: 'Absent from training', color: 'bg-red-500', count: absent },
  ];

  return (
    <div className="space-y-6">
      {/* Pie chart representation */}
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {(() => {
              let currentAngle = 0;
              return statusConfig.map((status) => {
                if (status.count === 0) return null;
                
                const percentage = (status.count / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                
                currentAngle = endAngle;
                
                // Calculate path for pie slice
                const startX = 50 + 45 * Math.cos((Math.PI * startAngle) / 180);
                const startY = 50 + 45 * Math.sin((Math.PI * startAngle) / 180);
                const endX = 50 + 45 * Math.cos((Math.PI * endAngle) / 180);
                const endY = 50 + 45 * Math.sin((Math.PI * endAngle) / 180);
                const largeArc = angle > 180 ? 1 : 0;
                
                const colorMap: Record<string, string> = {
                  'bg-green-500': '#22c55e',
                  'bg-yellow-500': '#eab308',
                  'bg-blue-500': '#3b82f6',
                  'bg-red-500': '#ef4444',
                };
                
                return (
                  <path
                    key={status.key}
                    d={`M 50 50 L ${startX} ${startY} A 45 45 0 ${largeArc} 1 ${endX} ${endY} Z`}
                    fill={colorMap[status.color]}
                    className="transition-all hover:opacity-80"
                  />
                );
              });
            })()}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-white rounded-full w-24 h-24 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground">times</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3">
        {statusConfig.map((status) => (
          <div key={status.key} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${status.color}`} />
            <div className="flex-1">
              <div className="text-sm font-medium">{status.label}</div>
              <div className="text-xs text-muted-foreground">
                {status.count} sessions ({((status.count / total) * 100).toFixed(1)}%)
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline view (last 10 sessions) */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Latest attendance</h4>
        <div className="flex gap-1">
          {data.slice(-10).map((item, idx) => {
            const statusColor: Record<string, string> = {
              present: 'bg-green-500',
              late: 'bg-yellow-500',
              excused: 'bg-blue-500',
              absent: 'bg-red-500',
            };
            
            return (
              <div
                key={idx}
                className={`flex-1 h-8 rounded ${statusColor[item.status] || 'bg-gray-300'}`}
                title={`${new Date(item.training_sessions.session_date).toLocaleDateString('en-US')} - ${item.status}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Oldest</span>
          <span>Latest</span>
        </div>
      </div>
    </div>
  );
}
