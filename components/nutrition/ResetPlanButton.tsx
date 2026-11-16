'use client';

import { useState, useTransition } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resetAthletePlan } from '@/lib/nutrition/plan-actions';

/** Removes an athlete's own plan so the team plan applies again. */
export function ResetPlanButton({ athleteId }: { athleteId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await resetAthletePlan(athleteId);
            if (!result.ok) setError(result.error);
          })
        }
      >
        <RotateCcw className="size-3.5" />
        {pending ? 'Resetting…' : 'Back to team plan'}
      </Button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
