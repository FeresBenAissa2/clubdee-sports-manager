import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { AuthShowcase } from '@/components/auth/AuthShowcase';

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background p-3 sm:p-4">
      <div className="relative flex flex-1 flex-col px-4 py-6 sm:px-10 lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-dot-pattern mask-fade-b opacity-40" />
        <div className="relative flex items-center justify-between">
          <Link href="/" aria-label="ClubDee Sports Club home" className="lg:invisible">
            <Logo tagline />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Home
          </Link>
        </div>

        <div className="relative mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-700">
          {children}
        </div>

        <p className="relative text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ClubDee Sports Club
        </p>
      </div>

      <div className="hidden w-[46%] max-w-[720px] lg:block">
        <AuthShowcase />
      </div>
    </div>
  );
}
