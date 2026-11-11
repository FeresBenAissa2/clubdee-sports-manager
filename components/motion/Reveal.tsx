'use client';

import { useRef } from 'react';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '@/lib/gsap';

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Seconds between each `[data-reveal]` child. */
  stagger?: number;
  /** Start offset in px. */
  y?: number;
  delay?: number;
  /** Animate each batch as it scrolls into view instead of on mount. */
  whenVisible?: boolean;
}

/**
 * Fades/slides in every descendant marked with `data-reveal`.
 * Do not nest Reveal components: the outer one would also pick up inner targets.
 */
export function Reveal({
  children,
  stagger = 0.07,
  y = 18,
  delay = 0,
  whenVisible = false,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]', ref.current);
      if (!targets.length) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.set(targets, { animation: 'none', autoAlpha: 0, y });

        if (whenVisible) {
          ScrollTrigger.batch(targets, {
            start: 'top 90%',
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: 0.8,
                ease: 'power3.out',
                stagger,
                overwrite: true,
              }),
          });
        } else {
          gsap.to(targets, {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            stagger,
            delay,
          });
        }
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div ref={ref} {...rest}>
      {children}
    </div>
  );
}
