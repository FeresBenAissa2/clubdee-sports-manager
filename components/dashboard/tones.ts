export const TONES = {
  brand: 'bg-blue-50 text-blue-600 ring-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
} as const;

export type Tone = keyof typeof TONES;
