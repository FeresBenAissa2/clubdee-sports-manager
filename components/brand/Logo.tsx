import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

const SHIELD_PATH =
  'M12 .6 23.2 4.2v9.2c0 7-4.8 11.8-11.2 14.2C5.6 25.2.8 20.4.8 13.4V4.2z';

// Mask instead of an SVG gradient: gradient ids break when the first copy of the
// logo sits inside a display:none sidebar.
const SHIELD_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 28'%3E%3Cpath d='${SHIELD_PATH}'/%3E%3C/svg%3E")`;

const maskStyle: CSSProperties = {
  maskImage: SHIELD_MASK,
  WebkitMaskImage: SHIELD_MASK,
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
};

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex size-9 shrink-0 drop-shadow-[0_6px_12px_oklch(0.53_0.232_268/0.4)]',
        className
      )}
    >
      <span
        className="absolute inset-0 bg-gradient-to-b from-blue-500 via-blue-600 to-violet-700"
        style={maskStyle}
      />
      <svg viewBox="0 0 24 28" fill="none" className="relative size-full" aria-hidden="true">
        <path
          d="M12 3 20.8 5.9v7.5c0 5.5-3.6 9.5-8.8 11.6-5.2-2.1-8.8-6.1-8.8-11.6V5.9z"
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="0.9"
        />
        <path
          d="M12 6.6l.85 2.23 2.38.12-1.85 1.5.62 2.3L12 11.45l-2 1.3.62-2.3-1.85-1.5 2.38-.12z"
          fill="white"
        />
        <path
          d="M6.2 15.4 12 19.4l5.8-4"
          stroke="oklch(0.9 0.19 125)"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

interface LogoProps {
  /** Use white text for dark backgrounds. */
  inverted?: boolean;
  /** Show the "Sports Club" line under the wordmark. */
  tagline?: boolean;
  className?: string;
  markClassName?: string;
}

export function Logo({ inverted = false, tagline = false, className, markClassName }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-[19px] font-semibold tracking-tight',
            inverted ? 'text-white' : 'text-foreground'
          )}
        >
          Club<span className={inverted ? 'text-blue-300' : 'text-blue-600'}>Dee</span>
        </span>
        {tagline && (
          <span
            className={cn(
              'mt-1 font-athletic text-[11px] font-bold uppercase tracking-[0.24em]',
              inverted ? 'text-white/50' : 'text-muted-foreground'
            )}
          >
            Sports Club
          </span>
        )}
      </span>
    </span>
  );
}
