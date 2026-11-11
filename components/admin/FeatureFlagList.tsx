'use client';

/**
 * Feature Flag List Component
 * 
 * Displays and manages feature flags with:
 * - Enable/disable toggle
 * - Rollout percentage slider
 * - Real-time updates
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/useToast';

interface FeatureFlag {
  name: string;
  enabled: boolean;
  rollout_percentage: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface FeatureFlagListProps {
  flags: FeatureFlag[];
}

export function FeatureFlagList({ flags: initialFlags }: FeatureFlagListProps) {
  const [flags, setFlags] = useState(initialFlags);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const updateFlag = async (
    name: string,
    updates: { enabled?: boolean; rollout_percentage?: number }
  ) => {
    setUpdating(name);

    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          ...updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update feature flag');
      }

      // Update local state
      setFlags(prev =>
        prev.map(flag =>
          flag.name === name
            ? { ...flag, ...updates, updated_at: new Date().toISOString() }
            : flag
        )
      );

      toast({
        title: 'Success',
        description: 'Feature flag updated successfully',
      });
    } catch (error) {
      console.error('Error updating feature flag:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feature flag',
        variant: 'error',
      });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-4">
      {flags.map(flag => (
        <div
          key={flag.name}
          className="p-4 border rounded-lg space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{flag.name}</h3>
                <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                {flag.enabled && (
                  <Badge variant="outline">
                    {flag.rollout_percentage}% rollout
                  </Badge>
                )}
              </div>
              {flag.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {flag.description}
                </p>
              )}
            </div>
            <Switch
              checked={flag.enabled}
              onCheckedChange={checked =>
                updateFlag(flag.name, { enabled: checked })
              }
              disabled={updating === flag.name}
            />
          </div>

          {flag.enabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rollout Percentage</span>
                <span className="font-medium">{flag.rollout_percentage}%</span>
              </div>
              <Slider
                value={[flag.rollout_percentage]}
                onValueChange={(values: number[]) =>
                  updateFlag(flag.name, { rollout_percentage: values[0] })
                }
                min={0}
                max={100}
                step={5}
                disabled={updating === flag.name}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(flag.updated_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
