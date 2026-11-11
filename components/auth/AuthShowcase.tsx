'use client';

import { useRef } from 'react';
import { BellRing, CheckCircle2, Clock3 } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import { cn } from '@/lib/utils';

const SESSIONS = [
  { time: '07:30', title: 'Swimming · technique', group: 'Juniors · Pool A', status: 'Done' },
  { time: '17:30', title: 'Football · finishing', group: 'U16 · Pitch 2', status: 'Next' },
  { time: '19:00', title: 'Basketball · team play', group: 'Seniors · Hall 1', status: 'Later' },
];

export function AuthShowcase() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.set('[data-reveal]', { animation: 'none' });
        gsap
          .timeline({ defaults: { ease: 'power3.out' }, delay: 0.15 })
          .fromTo('.sc-line', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12 })
          .fromTo('.sc-card', { autoAlpha: 0, y: 40, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9 }, '-=0.4')
          .from('.sc-row', { autoAlpha: 0, x: -16, duration: 0.5, stagger: 0.1 }, '-=0.5')
          .fromTo(
            '.sc-chip',
            { autoAlpha: 0, y: 20, scale: 0.9 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.18, ease: 'back.out(1.7)' },
            '-=0.2'
          )
          .fromTo('.sc-meta', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, '-=0.3');

        gsap.utils.toArray<HTMLElement>('.sc-chip-inner').forEach((el, i) => {
          gsap.to(el, { y: -8, duration: 2.8 + i * 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        });

        gsap.to('.sc-progress', {
          scaleX: 1,
          duration: 2.4,
          ease: 'power2.inOut',
          repeat: -1,
          repeatDelay: 1.2,
        });
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div
      ref={ref}
      className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-ink-radial p-10 text-white xl:p-12"
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-dark mask-fade-b" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-violet-600/25 blur-3xl" />

      <div className="relative">
        <Logo inverted tagline />
      </div>

      <div className="relative mt-auto">
        <h2 className="max-w-md font-athletic text-6xl leading-[0.9] font-extrabold uppercase italic xl:text-7xl">
          <span data-reveal className="sc-line block">Train.</span>
          <span data-reveal className="sc-line block text-outline">Compete.</span>
          <span data-reveal className="sc-line block text-lime-300">Belong.</span>
        </h2>

        <div className="relative mt-10 max-w-md">
          <div
            data-reveal
            className="sc-card glass-dark rounded-2xl border border-white/10 p-5 shadow-2xl shadow-black/40"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Today at the club</p>
              <span className="text-xs text-white/50">3 scheduled</span>
            </div>
            <ul className="mt-4 space-y-2.5">
              {SESSIONS.map((s) => (
                <li
                  key={s.time}
                  className="sc-row flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                >
                  <span className="w-11 font-mono text-xs text-white/55">{s.time}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="truncate text-xs text-white/45">{s.group}</p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      s.status === 'Done' && 'bg-emerald-400/15 text-emerald-300',
                      s.status === 'Next' && 'bg-lime-300 text-ink-950',
                      s.status === 'Later' && 'bg-white/10 text-white/60'
                    )}
                  >
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="sc-progress h-full origin-left rounded-full bg-gradient-to-r from-blue-400 to-lime-300"
                style={{ transform: 'scaleX(0.35)' }}
              />
            </div>
          </div>

          <div data-reveal className="sc-chip absolute -top-7 -right-6">
            <div className="sc-chip-inner flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-ink-950 shadow-xl shadow-black/30">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span className="text-xs font-semibold">18 / 20 present</span>
            </div>
          </div>
          <div data-reveal className="sc-chip absolute -bottom-6 -left-5">
            <div className="sc-chip-inner flex items-center gap-2.5 rounded-xl border border-white/10 bg-gradient-to-br from-blue-600 to-violet-700 px-3 py-2 shadow-xl shadow-blue-950/50">
              <BellRing className="size-4 text-lime-200" />
              <span className="text-xs font-semibold">Match moved to Saturday</span>
            </div>
          </div>
        </div>

        <div data-reveal className="sc-meta mt-14 flex items-center gap-2 text-sm text-white/50">
          <Clock3 className="size-4" />
          See you at training.
        </div>
      </div>
    </div>
  );
}
