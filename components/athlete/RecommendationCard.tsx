'use client';

import Link from 'next/link';
import { LightbulbIcon, ArrowRight, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  action: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
  icon?: React.ReactNode;
}

interface RecommendationCardProps {
  recommendations: Recommendation[];
}

export function RecommendationCard({ recommendations }: RecommendationCardProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleRecommendations = recommendations.filter(
    (rec) => !dismissedIds.includes(rec.id)
  );

  if (visibleRecommendations.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  const priorityConfig = {
    high: {
      bg: 'bg-gradient-to-br from-red-50 to-orange-50',
      border: 'border-red-200',
      text: 'text-red-900',
      button: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
      badge: 'bg-red-100 text-red-700',
      iconBg: 'bg-red-100',
    },
    medium: {
      bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-sm hover:shadow-md',
      badge: 'bg-yellow-100 text-yellow-700',
      iconBg: 'bg-yellow-100',
    },
    low: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md',
      badge: 'bg-blue-100 text-blue-700',
      iconBg: 'bg-blue-100',
    },
  };

  const priorityLabels = {
    high: 'Important',
    medium: 'Recommended',
    low: 'General',
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex size-8 items-center justify-center rounded-lg bg-amber-50 ring-1 ring-amber-100">
          <LightbulbIcon className="w-4 h-4 text-amber-500" />
          <Sparkles className="w-3 h-3 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Recommended for you</h2>
        <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {visibleRecommendations.length}
        </span>
      </div>
      
      <div className="space-y-3">
        {visibleRecommendations.map((rec, index) => {
          const config = priorityConfig[rec.priority];
          return (
            <div
              key={rec.id}
              className={`border rounded-xl p-4 ${config.bg} ${config.border} relative overflow-hidden transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-top-2`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Priority Badge */}
              <div className="absolute top-2 right-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.badge}`}>
                  {priorityLabels[rec.priority]}
                </span>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => handleDismiss(rec.id)}
                className="absolute top-2 right-16 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3 pr-20">
                {rec.icon && (
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}>
                    {rec.icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold mb-1 ${config.text}`}>
                    {rec.title}
                  </h3>
                  <p className={`text-xs mb-3 ${config.text} opacity-75 leading-relaxed`}>
                    {rec.description}
                  </p>
                  <Link
                    href={rec.href}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-all ${config.button} transform hover:scale-105`}
                  >
                    {rec.action}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Decorative Element */}
              <div className="absolute bottom-0 right-0 w-20 h-20 opacity-5">
                <div className="w-full h-full rounded-full bg-current transform translate-x-8 translate-y-8"></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helpful Tip */}
      {visibleRecommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-muted-foreground text-center">
            These tips help you get the most out of ClubDee
          </p>
        </div>
      )}
    </div>
  );
}
