'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MealLogger, type LoggedMeal } from './MealLogger';

export function LogMealDialog({ meals }: { meals: LoggedMeal[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="size-3.5" />
          Log a meal
          {meals.length > 0 && (
            <span className="ml-0.5 rounded-full bg-secondary px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {meals.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Log a meal</DialogTitle>
          <DialogDescription>
            Something outside the plan? Tap what you ate — no grams, no calories.
          </DialogDescription>
        </DialogHeader>
        <MealLogger meals={meals} embedded onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
