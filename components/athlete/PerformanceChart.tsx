'use client';

interface PerformanceDataPoint {
  test_date: string;
  test_name: string;
  score: number;
  unit: string;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No test results for this period
      </div>
    );
  }

  // Group by test name
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.test_name]) {
      acc[item.test_name] = [];
    }
    acc[item.test_name].push(item);
    return acc;
  }, {} as Record<string, PerformanceDataPoint[]>);

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
  ];

  return (
    <div className="space-y-6">
      {Object.entries(groupedData).map(([testName, points], index) => {
        const maxScore = Math.max(...points.map((p) => p.score));
        const minScore = Math.min(...points.map((p) => p.score));
        const improvement = points.length > 1 ? points[points.length - 1].score - points[0].score : 0;
        const unit = points[0].unit;

        return (
          <div key={testName} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{testName}</h4>
              <div className="flex items-center gap-2 text-xs">
                {improvement !== 0 && (
                  <span className={improvement > 0 ? 'text-green-600' : 'text-red-600'}>
                    {improvement > 0 ? '+' : ''}{improvement.toFixed(1)} {unit}
                  </span>
                )}
              </div>
            </div>

            {/* Simple bar chart */}
            <div className="space-y-1">
              {points.map((point, idx) => {
                const percentage = maxScore > 0 ? (point.score / maxScore) * 100 : 0;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-20">
                      {new Date(point.test_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`${colors[index % colors.length]} h-full rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-end pr-2">
                        <span className="text-xs font-medium">
                          {point.score.toFixed(1)} {unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Maximum: {maxScore.toFixed(1)} {unit}</span>
              <span>Lowest: {minScore.toFixed(1)} {unit}</span>
              <span>Average: {(points.reduce((sum, p) => sum + p.score, 0) / points.length).toFixed(1)} {unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
