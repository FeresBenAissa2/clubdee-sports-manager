'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Trophy,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import { cn } from '@/lib/utils';

export type ShellRole = 'admin' | 'coach' | 'athlete';

export interface ShellUser {
  name: string;
  email: string;
  subtitle?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV: Record<ShellRole, NavSection[]> = {
  admin: [
    {
      label: 'Overview',
      items: [{ label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard }],
    },
    {
      label: 'Membership',
      items: [
        { label: 'Applications', href: '/dashboard/admin/applications', icon: FileCheck2 },
        { label: 'Create user', href: '/dashboard/admin/create-user', icon: UserPlus },
      ],
    },
    {
      label: 'Organization',
      items: [
        { label: 'Clubs', href: '/dashboard/admin/clubs', icon: Building2 },
        { label: 'Coaches', href: '/dashboard/admin/coaches', icon: UserCog },
        { label: 'Athletes', href: '/dashboard/admin/athletes', icon: Users },
      ],
    },
    {
      label: 'Training',
      items: [
        { label: 'Sessions', href: '/dashboard/admin/sessions', icon: CalendarDays },
        { label: 'Attendance', href: '/dashboard/admin/attendance', icon: ClipboardCheck },
        { label: 'Reports', href: '/dashboard/admin/reports', icon: BarChart3 },
      ],
    },
    {
      label: 'System',
      items: [{ label: 'Settings', href: '/dashboard/admin/settings', icon: Settings }],
    },
  ],
  coach: [
    {
      label: 'Overview',
      items: [{ label: 'Home', href: '/dashboard/coach', icon: LayoutDashboard }],
    },
    {
      label: 'Membership',
      items: [
        { label: 'Applications', href: '/dashboard/coach/applications', icon: FileCheck2 },
        { label: 'Athletes', href: '/dashboard/coach/athletes', icon: Users },
      ],
    },
    {
      label: 'Training',
      items: [
        { label: 'Sessions', href: '/dashboard/coach/sessions', icon: CalendarDays },
        { label: 'Attendance', href: '/dashboard/coach/attendance', icon: ClipboardCheck },
        { label: 'Performance', href: '/dashboard/coach/performance', icon: Activity },
        { label: 'Reports', href: '/dashboard/coach/reports', icon: BarChart3 },
      ],
    },
    {
      label: 'Club life',
      items: [
        { label: 'Announcements', href: '/dashboard/coach/announcements', icon: Megaphone },
        { label: 'Tournaments', href: '/dashboard/coach/tournaments', icon: Trophy },
      ],
    },
  ],
  athlete: [
    {
      label: 'Overview',
      items: [{ label: 'Home', href: '/dashboard/athlete', icon: LayoutDashboard }],
    },
    {
      label: 'Training',
      items: [
        { label: 'Schedule', href: '/dashboard/athlete/schedule', icon: CalendarDays },
        { label: 'Attendance', href: '/dashboard/athlete/attendance', icon: ClipboardCheck },
        { label: 'Performance', href: '/dashboard/athlete/performance', icon: Activity },
      ],
    },
    {
      label: 'Club life',
      items: [
        { label: 'Announcements', href: '/dashboard/athlete/announcements', icon: Megaphone },
        { label: 'My applications', href: '/dashboard/athlete/applications', icon: FileText },
        { label: 'Profile', href: '/dashboard/athlete/profile', icon: UserRound },
      ],
    },
  ],
};

const MOBILE_TABS: Record<ShellRole, string[]> = {
  admin: [
    '/dashboard/admin',
    '/dashboard/admin/applications',
    '/dashboard/admin/clubs',
    '/dashboard/admin/sessions',
  ],
  coach: [
    '/dashboard/coach',
    '/dashboard/coach/sessions',
    '/dashboard/coach/attendance',
    '/dashboard/coach/athletes',
  ],
  athlete: [
    '/dashboard/athlete',
    '/dashboard/athlete/schedule',
    '/dashboard/athlete/performance',
    '/dashboard/athlete/announcements',
  ],
};

const ROLE_LABEL: Record<ShellRole, string> = {
  admin: 'Club office',
  coach: 'Coach area',
  athlete: 'Member area',
};

function initialsOf(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
}

function isActive(pathname: string, href: string, root: string) {
  if (href === root) return pathname === root;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface DashboardShellProps {
  role: ShellRole;
  user: ShellUser;
  /** Counter shown next to a nav item, keyed by its href. */
  badges?: Record<string, number>;
  /** Extra classes for the scrollable content area (e.g. padding for pages without their own). */
  contentClassName?: string;
  children: React.ReactNode;
}

export function DashboardShell({
  role,
  user,
  badges = {},
  contentClassName,
  children,
}: DashboardShellProps) {
  const pathname = usePathname() ?? '';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const root = `/dashboard/${role}`;
  const sections = NAV[role];
  const allItems = sections.flatMap((s) => s.items);
  const tabs = MOBILE_TABS[role]
    .map((href) => allItems.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] lg:block">
        <SidebarPanel
          role={role}
          user={user}
          sections={sections}
          pathname={pathname}
          root={root}
          badges={badges}
          animatedIndicator
        />
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 px-4 lg:hidden">
        <Link href={root} aria-label="Dashboard home">
          <Logo markClassName="size-8" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-semibold text-white">
            {initialsOf(user.name, user.email)}
          </span>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-xs transition-colors hover:bg-accent"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        inert={!drawerOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-ink-950/50 backdrop-blur-sm transition-opacity duration-300',
            drawerOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-[86%] max-w-[300px] shadow-2xl transition-transform duration-300 ease-out',
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <SidebarPanel
            role={role}
            user={user}
            sections={sections}
            pathname={pathname}
            root={root}
            badges={badges}
            onClose={() => setDrawerOpen(false)}
            onNavigate={() => setDrawerOpen(false)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="lg:pl-[272px]">
        <div className={cn('pb-28 lg:pb-12', contentClassName)}>{children}</div>
      </div>

      {/* Mobile tab bar */}
      <nav
        className="glass safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/70 lg:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2">
          {tabs.map((item) => {
            const active = isActive(pathname, item.href, root);
            const count = badges[item.href] ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors',
                  active ? 'text-blue-700' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300',
                    active ? 'bg-blue-100/80' : 'bg-transparent'
                  )}
                >
                  <item.icon className={cn('size-5', active && 'stroke-[2.3]')} />
                </span>
                {item.label}
                {count > 0 && (
                  <span className="absolute top-0.5 right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex h-8 w-12 items-center justify-center rounded-full">
              <Menu className="size-5" />
            </span>
            More
          </button>
        </div>
      </nav>
    </div>
  );
}

interface SidebarPanelProps {
  role: ShellRole;
  user: ShellUser;
  sections: NavSection[];
  pathname: string;
  root: string;
  badges: Record<string, number>;
  animatedIndicator?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
}

function SidebarPanel({
  role,
  user,
  sections,
  pathname,
  root,
  badges,
  animatedIndicator = false,
  onClose,
  onNavigate,
}: SidebarPanelProps) {
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const placedRef = useRef(false);

  useGSAP(
    () => {
      if (!animatedIndicator) return;
      const nav = navRef.current;
      const indicator = indicatorRef.current;
      if (!nav || !indicator) return;

      const place = (animate: boolean) => {
        const active = nav.querySelector<HTMLElement>('[data-active="true"]');
        if (!active) {
          gsap.to(indicator, { autoAlpha: 0, duration: 0.2 });
          return;
        }
        // Hidden sidebar (mobile breakpoint) reports zero size; wait for the resize.
        if (active.offsetHeight === 0) return;

        const target = { y: active.offsetTop, height: active.offsetHeight, autoAlpha: 1 };
        const reduced = !window.matchMedia(MOTION_OK).matches;
        if (!animate || !placedRef.current || reduced) {
          gsap.set(indicator, target);
          placedRef.current = true;
        } else {
          gsap.to(indicator, { ...target, duration: 0.45, ease: 'power3.out' });
        }
      };

      place(true);
      let size = `${nav.offsetWidth}x${nav.offsetHeight}`;
      const observer = new ResizeObserver(() => {
        const next = `${nav.offsetWidth}x${nav.offsetHeight}`;
        if (next === size) return;
        size = next;
        place(false);
      });
      observer.observe(nav);
      return () => observer.disconnect();
    },
    { dependencies: [pathname, animatedIndicator], scope: navRef }
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-ink-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-ink-radial opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-grid-dark mask-fade-b opacity-40" />

      <div className="relative flex h-16 items-center justify-between px-5">
        <Link href={root} onClick={onNavigate} aria-label="Dashboard home">
          <Logo inverted />
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="relative mx-4 mb-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
          ClubDee Sports Club
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-sm font-medium text-white">
          <span className="size-1.5 rounded-full bg-lime-300 shadow-[0_0_10px] shadow-lime-300/70" />
          {ROLE_LABEL[role]}
        </p>
      </div>

      <nav ref={navRef} className="relative flex-1 overflow-y-auto px-3 py-3 scrollbar-hide">
        {animatedIndicator && (
          <div
            ref={indicatorRef}
            className="invisible absolute inset-x-3 top-0 rounded-lg bg-white/[0.08] ring-1 ring-inset ring-white/10"
            aria-hidden="true"
          >
            <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-blue-300 to-violet-400" />
          </div>
        )}
        {sections.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = isActive(pathname, item.href, root);
              const count = badges[item.href] ?? 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  data-active={active}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? cn('text-white', !animatedIndicator && 'bg-white/[0.08]')
                      : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn('size-[18px]', active ? 'text-blue-300' : 'text-white/45')}
                  />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-rose-500/90 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="relative border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-semibold text-white ring-2 ring-white/10">
            {initialsOf(user.name, user.email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name || user.email}</p>
            <p className="truncate text-xs text-white/50">{user.subtitle || user.email}</p>
          </div>
          <Link
            href="/logout"
            prefetch={false}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-[18px]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
