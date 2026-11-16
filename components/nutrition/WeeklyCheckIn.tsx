'use client';

import { useState, useTransition } from 'react';
import { HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveCheckIn } from '@/lib/nutrition/actions';
import {
  CHECKIN_FIELDS,
  NOTE_MAX,
  type CheckInField,
  type CheckInScores,
} from '@/lib/nutrition/catalog';
import { cn } from '@/lib/utils';

interface WeeklyCheckInProps {
  initial: (CheckInScores & { note: string }) | null;
}

export function WeeklyCheckIn({ initial }: WeeklyCheckInProps) {
  const [scores, setScores] = useState<Partial<CheckInScores>>(initial ?? {});
  const [note, setNote] = useState(initial?.note ?? '');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(initial !== null);

  const complete = CHECKIN_FIELDS.every((f) => scores[f.id]);

  const pick = (field: CheckInField, value: number) => {
    setScores((s) => ({ ...s, [field]: value }));
    setMessage(null);
  };

  const submit = () => {
    startTransition(async () => {
      const result = await saveCheckIn({ ...scores, note });
      if (result.ok) {
        setSaved(true);
        setMessage({ tone: 'ok', text: 'Check-in saved. Your coach can see it.' });
      } else {
        setMessage({ tone: 'error', text: result.error });
      }
    });
  };

  return (
    <section
      data-reveal
      aria-labelledby="checkin-title"
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="checkin-title" className="text-lg font-semibold text-foreground">
            Weekly check-in
          </h2>
          <p className="text-sm text-muted-foreground">
            {saved
              ? 'Done for this week — you can still update it.'
              : 'How did you feel this week? 30 seconds.'}
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-100">
          <HeartPulse className="size-5" />
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {CHECKIN_FIELDS.map((field) => (
          <fieldset key={field.id}>
            <legend className="mb-1.5 text-sm font-medium text-foreground">{field.label}</legend>
            <div className="grid grid-cols-5 gap-1.5">
              {field.faces.map((face, i) => {
                const value = i + 1;
                const active = scores[field.id] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${field.label} ${value} of 5`}
                    onClick={() => pick(field.id, value)}
                    className={cn(
                      'flex h-11 items-center justify-center rounded-xl border text-xl transition-all',
                      active
                        ? 'scale-105 border-violet-500 bg-violet-50 shadow-sm'
                        : 'border-border bg-background opacity-70 hover:opacity-100'
                    )}
                  >
                    {face}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="checkin-note">
        Anything to tell your coach?{' '}
        <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <Input
        id="checkin-note"
        value={note}
        maxLength={NOTE_MAX}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. exams this week, slept badly…"
        className="mt-1.5"
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        {message ? (
          <p
            role={message.tone === 'error' ? 'alert' : 'status'}
            className={cn('text-sm', message.tone === 'ok' ? 'text-emerald-600' : 'text-rose-600')}
          >
            {message.text}
          </p>
        ) : (
          <span />
        )}
        <Button type="button" onClick={submit} disabled={!complete || pending} className="shrink-0">
          {pending ? 'Saving…' : saved ? 'Update' : 'Submit'}
        </Button>
      </div>
    </section>
  );
}
