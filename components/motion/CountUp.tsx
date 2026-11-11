'use client';

import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';

interface CountUpProps {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export function CountUp({
  value,
  suffix = '',
  decimals = 0,
  duration = 1.4,
  delay = 0.2,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = (n: number) =>
    `${n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;

  useGSAP(
    () => {
      // Write to React's own text node so later re-renders still reconcile.
      const node = ref.current?.firstChild;
      if (!node) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const counter = { n: 0 };
        node.nodeValue = format(0);
        gsap.to(counter, {
          n: value,
          duration,
          delay,
          ease: 'power3.out',
          onUpdate: () => {
            node.nodeValue = format(counter.n);
          },
        });
        return () => {
          node.nodeValue = format(value);
        };
      });

      return () => mm.revert();
    },
    { dependencies: [value], scope: ref }
  );

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
