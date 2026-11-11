import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';

interface BrandScreenProps {
  children: React.ReactNode;
  /** Right side of the top bar. */
  aside?: React.ReactNode;
  className?: string;
}

export function BrandScreen({ children, aside, className }: BrandScreenProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-gradient-to-b from-blue-100/70 via-violet-50/40 to-transparent" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-blue-400/15 blur-[100px]" />
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern mask-fade-b opacity-50" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="ClubDee Sports Club home">
          <Logo tagline />
        </Link>
        {aside}
      </header>
      <div
        className={cn(
          'relative motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-700',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
