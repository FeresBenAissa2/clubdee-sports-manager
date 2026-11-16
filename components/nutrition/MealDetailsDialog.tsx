'use client';

import { Clock, Info, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FOOD_BY_ID } from '@/lib/nutrition/catalog';
import type { FuelStep } from '@/lib/nutrition/plan';
import {
  itemNutrients,
  macroSplit,
  measureText,
  sumNutrients,
  type PortionItem,
} from '@/lib/nutrition/portions';
import { FoodDots } from './FoodChip';
import { MacroBar } from './MacroBar';

const r = (n: number) => Math.round(n);

interface MealDetailsDialogProps {
  step: FuelStep;
  items: PortionItem[];
  showNumbers: boolean;
  /** Button style: light card or the dark hero. */
  dark?: boolean;
}

export function MealDetailsDialog({
  step,
  items,
  showNumbers,
  dark = false,
}: MealDetailsDialogProps) {
  const total = sumNutrients(items);
  const totalGrams = items.reduce((sum, i) => sum + i.grams, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {dark ? (
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <ListOrdered className="size-4" />
            Meal details
          </button>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="text-blue-600">
            <ListOrdered className="size-3.5" />
            Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {step.start}–{step.end}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{step.why}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 text-left font-medium">
                  Food
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Amount
                </th>
                {showNumbers && (
                  <>
                    <th scope="col" className="py-2 pl-3 text-right font-medium">
                      kcal
                    </th>
                    <th scope="col" className="py-2 pl-2 text-right font-medium" title="Protein">
                      P
                    </th>
                    <th scope="col" className="py-2 pl-2 text-right font-medium" title="Carbs">
                      C
                    </th>
                    <th scope="col" className="py-2 pl-2 text-right font-medium" title="Fat">
                      F
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((item) => {
                const v = itemNutrients(item);
                return (
                  <tr key={item.food_id}>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2">
                        <FoodDots id={item.food_id} className="text-background" />
                        <span className="font-medium text-foreground">
                          {FOOD_BY_ID.get(item.food_id)?.name ?? item.food_id}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <span className="font-semibold text-foreground tabular-nums">
                        {item.grams} g
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {measureText(item.food_id, item.grams)}
                      </span>
                    </td>
                    {showNumbers && (
                      <>
                        <td className="py-2.5 pl-3 text-right tabular-nums">{r(v.kcal)}</td>
                        <td className="py-2.5 pl-2 text-right tabular-nums">{r(v.protein)}</td>
                        <td className="py-2.5 pl-2 text-right tabular-nums">{r(v.carbs)}</td>
                        <td className="py-2.5 pl-2 text-right tabular-nums">{r(v.fat)}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-semibold text-foreground">
                <td className="py-2.5">Total</td>
                <td className="py-2.5 text-right tabular-nums">{totalGrams} g</td>
                {showNumbers && (
                  <>
                    <td className="py-2.5 pl-3 text-right tabular-nums">{r(total.kcal)}</td>
                    <td className="py-2.5 pl-2 text-right tabular-nums">{r(total.protein)} g</td>
                    <td className="py-2.5 pl-2 text-right tabular-nums">{r(total.carbs)} g</td>
                    <td className="py-2.5 pl-2 text-right tabular-nums">{r(total.fat)} g</td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>

        {showNumbers && <MacroBar split={macroSplit(total)} />}

        <p className="flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {showNumbers
            ? 'Portions set by your coach. Values are approximate, from typical home recipes.'
            : 'Your coach set these portions for your training. Eat until you feel satisfied, and tell your coach if it often feels too much or too little.'}
        </p>
      </DialogContent>
    </Dialog>
  );
}
