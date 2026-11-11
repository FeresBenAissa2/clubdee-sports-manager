'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Megaphone,
  Plus,
  Send,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { cn } from '@/lib/utils';
import { SportArt } from './SportArt';
import { FALLBACK_SPORTS, SPORT_STYLE, sportKind, type LandingSport } from './sports';

const HEADLINE = [
  { text: 'Train harder.', style: 'text-white' },
  { text: 'Play together.', style: 'text-outline' },
  { text: 'Join the club.', style: 'text-lime-300' },
];

const NAV = [
  { href: '#sports', label: 'Sports' },
  { href: '#why', label: 'Why ClubDee' },
  { href: '#join', label: 'How to join' },
  { href: '#faq', label: 'FAQ' },
];

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Send,
    title: 'Apply online',
    body: 'Create an account, add your details and an emergency contact, then choose your sport. It only takes a few minutes.',
  },
  {
    icon: ClipboardList,
    title: 'Your coach reviews it',
    body: 'The coach of your sport reviews your application. You can follow its status from your account at any time.',
  },
  {
    icon: Trophy,
    title: 'Start training',
    body: 'Once you are approved, your schedule appears in your member area. See you at the next session!',
  },
];

const MEMBER_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: CalendarDays, title: 'Training schedule', body: 'Every upcoming session, with the time and place.' },
  { icon: CheckCircle2, title: 'Attendance', body: 'See how many sessions you have attended this month.' },
  { icon: TrendingUp, title: 'Results', body: 'Your test results and personal bests, season after season.' },
  { icon: Megaphone, title: 'Club news', body: 'Announcements from your coaches, so you never miss a change.' },
  { icon: Trophy, title: 'Tournaments', body: 'The competitions you have been selected for.' },
];

const FAQ = [
  {
    q: 'Do I need experience to join?',
    a: 'No. Beginners are welcome in every sport. Your coach sees your application and helps you find your place in the group.',
  },
  {
    q: 'What do I need to apply?',
    a: 'An email address, your personal details, a phone number and an emergency contact. Health information is optional.',
  },
  {
    q: 'How long does approval take?',
    a: 'A coach reviews every application. You can sign in while you wait and check the status of your application at any time.',
  },
  {
    q: 'Where do I find my training times?',
    a: 'Once you are a member, your schedule, attendance, results and club news are all in your member area, on your phone or computer.',
  },
];

const WEEK = [
  { day: 'Mon', slot: null },
  { day: 'Tue', slot: '18:00' },
  { day: 'Wed', slot: null },
  { day: 'Thu', slot: '18:00' },
  { day: 'Fri', slot: null },
  { day: 'Sat', slot: 'Match' },
  { day: 'Sun', slot: null },
];

const EYEBROW = 'font-athletic text-sm font-bold uppercase tracking-[0.24em]';
const SECTION_TITLE = 'font-athletic font-extrabold uppercase italic leading-[0.92] tracking-[-0.005em]';

function listSports(names: string[]) {
  const words = names.map((n, i) => (i === 0 ? n : n.toLowerCase()));
  return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(words);
}

interface LandingPageProps {
  signedIn: boolean;
  sports: LandingSport[];
  season: string;
}

export function LandingPage({ signedIn, sports, season }: LandingPageProps) {
  const root = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const list = sports.length > 0 ? sports : FALLBACK_SPORTS;
  const names = list.map((s) => s.name);
  const memberVenue = SPORT_STYLE[sportKind(names[0])].venue;
  const bandItems = [...names, 'All levels welcome', `Season ${season}`, 'Join the club'];
  const joinHref = signedIn ? '/dashboard' : '/register-membership';
  const joinLabel = signedIn ? 'My dashboard' : 'Apply for membership';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        gsap.set('[data-reveal]', { animation: 'none' });

        // Floodlights flicker on, then the headline and member card arrive.
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .fromTo('.hero-light', { autoAlpha: 0 }, { autoAlpha: 0.7, duration: 0.06, stagger: 0.14 })
          .to('.hero-light', { autoAlpha: 0.15, duration: 0.08 })
          .to('.hero-light', { autoAlpha: 1, duration: 0.8 })
          .fromTo('.hero-eyebrow', { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.15)
          .set('.hero-title', { autoAlpha: 1 }, 0.2)
          .from('.hero-line', { yPercent: 115, skewY: 7, duration: 1, stagger: 0.12, ease: 'power4.out' }, 0.2)
          .fromTo('.hero-fade', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1 }, 0.75)
          .set('.hero-pitch', { autoAlpha: 1 }, 0.3)
          .fromTo(
            '.hero-pitch .art-line',
            { strokeDasharray: 1, strokeDashoffset: 1 },
            { strokeDashoffset: 0, duration: 2, stagger: { amount: 0.6 }, ease: 'power2.inOut' },
            0.3
          )
          .fromTo(
            '.hero-card-wrap',
            { autoAlpha: 0, y: 70, rotationY: -28, rotationX: 8, transformPerspective: 1200 },
            { autoAlpha: 1, y: 0, rotationY: 0, rotationX: 0, duration: 1.4, ease: 'expo.out' },
            0.45
          )
          .fromTo(
            '.hero-chip',
            { autoAlpha: 0, y: 20, scale: 0.85 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.15, ease: 'back.out(1.7)' },
            1.1
          );

        gsap.set('.hero-shine', { skewX: -14, xPercent: -180, autoAlpha: 1 });
        gsap.to('.hero-shine', {
          xPercent: 420,
          duration: 1.5,
          ease: 'power2.inOut',
          repeat: -1,
          repeatDelay: 3.5,
          delay: 2,
        });

        const sportList = root.current?.querySelector<HTMLElement>('.hero-sport-list');
        const count = sportList ? sportList.children.length - 1 : 0;
        if (sportList && count > 1) {
          const step = 100 / (count + 1);
          const cycle = gsap.timeline({ repeat: -1, delay: 1.6 });
          for (let i = 1; i <= count; i++) {
            cycle.to(sportList, { yPercent: -step * i, duration: 0.65, ease: 'power3.inOut' }, '+=1.9');
          }
          cycle.set(sportList, { yPercent: 0 });
        }

        gsap.utils.toArray<HTMLElement>('.hero-chip-inner').forEach((el, i) => {
          gsap.to(el, {
            y: -9,
            duration: 2.4 + i * 0.5,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: i * 0.4,
          });
        });

        gsap.to('.marquee-a', { xPercent: -50, duration: 32, ease: 'none', repeat: -1 });
        gsap.fromTo('.marquee-b', { xPercent: -50 }, { xPercent: 0, duration: 40, ease: 'none', repeat: -1 });

        gsap.utils.toArray<HTMLElement>('.section-head').forEach((el) => {
          gsap.from(el.children, {
            autoAlpha: 0,
            y: 28,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          });
        });

        gsap.set('.sport-card', { autoAlpha: 0, y: 50 });
        gsap.set('.sport-card .art-line', { strokeDasharray: 1, strokeDashoffset: 1 });
        ScrollTrigger.batch('.sport-card', {
          start: 'top 88%',
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' });
            batch.forEach((card, i) => {
              gsap.to(card.querySelectorAll('.art-line'), {
                strokeDashoffset: 0,
                duration: 1.4,
                stagger: { amount: 0.5 },
                ease: 'power2.inOut',
                delay: 0.25 + i * 0.12,
              });
            });
          },
        });

        gsap.set('.why-tile', { autoAlpha: 0, y: 40 });
        ScrollTrigger.batch('.why-tile', {
          start: 'top 88%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }),
        });
        gsap.fromTo(
          '.spark-line',
          { strokeDasharray: 1, strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            duration: 1.6,
            delay: 0.3,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: '.spark', start: 'top 85%', once: true },
          }
        );
        gsap.from('.spark-dot', {
          scale: 0,
          transformOrigin: '50% 50%',
          duration: 0.5,
          delay: 1.7,
          ease: 'back.out(2.5)',
          scrollTrigger: { trigger: '.spark', start: 'top 85%', once: true },
        });
        gsap.from('.week-chip', {
          autoAlpha: 0,
          scale: 0.4,
          duration: 0.5,
          delay: 0.3,
          stagger: 0.12,
          ease: 'back.out(2)',
          scrollTrigger: { trigger: '.week', start: 'top 88%', once: true },
        });

        gsap.fromTo(
          '.steps-line',
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { trigger: '.steps', start: 'top 75%', end: 'bottom 55%', scrub: 0.6 },
          }
        );
        gsap.from('.step', {
          autoAlpha: 0,
          y: 30,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.steps', start: 'top 80%', once: true },
        });

        gsap.fromTo(
          '.phone',
          { y: 70 },
          {
            y: -30,
            ease: 'none',
            scrollTrigger: { trigger: '.members', start: 'top bottom', end: 'bottom top', scrub: 0.8 },
          }
        );
        gsap.from('.phone-item', {
          autoAlpha: 0,
          y: 24,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.phone', start: 'top 75%', once: true },
        });
        gsap.from('.member-point', {
          autoAlpha: 0,
          x: -24,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.member-points', start: 'top 85%', once: true },
        });

        gsap.from('.faq-item', {
          autoAlpha: 0,
          y: 20,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.faq', start: 'top 85%', once: true },
        });

        gsap.from('.cta-card', {
          autoAlpha: 0,
          y: 50,
          scale: 0.97,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.cta-card', start: 'top 85%', once: true },
        });
        gsap.from('.cta-line', {
          yPercent: 110,
          duration: 0.9,
          delay: 0.2,
          stagger: 0.1,
          ease: 'power4.out',
          scrollTrigger: { trigger: '.cta-card', start: 'top 85%', once: true },
        });
      });

      mm.add(`${MOTION_OK} and (pointer: fine)`, () => {
        const stage = root.current?.querySelector<HTMLElement>('.hero-section');
        const card = root.current?.querySelector<HTMLElement>('.hero-card');
        if (!stage || !card) return;

        gsap.set(card, { transformPerspective: 900 });
        const rotX = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3.out' });
        const rotY = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3.out' });
        const layers = gsap.utils.toArray<HTMLElement>('[data-depth]', stage).map((el) => ({
          depth: Number(el.dataset.depth),
          x: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' }),
          y: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' }),
        }));

        const onMove = (e: PointerEvent) => {
          const r = stage.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          rotY(px * 16);
          rotX(-py * 12);
          card.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
          card.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
          layers.forEach((l) => {
            l.x(px * l.depth * 36);
            l.y(py * l.depth * 28);
          });
        };
        const onLeave = () => {
          rotX(0);
          rotY(0);
          layers.forEach((l) => {
            l.x(0);
            l.y(0);
          });
        };

        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerleave', onLeave);
        return () => {
          stage.removeEventListener('pointermove', onMove);
          stage.removeEventListener('pointerleave', onLeave);
        };
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} className="relative overflow-x-clip bg-background">
      {/* Navigation */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-white/10 bg-ink-950/90 py-3 backdrop-blur-xl backdrop-saturate-150'
            : 'py-5'
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="ClubDee Sports Club home">
            <Logo inverted tagline />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            {!signedIn && (
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white min-[420px]:inline-flex sm:px-4"
              >
                Member sign in
              </Link>
            )}
            <Link
              href={joinHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-ink-950 shadow-lg shadow-black/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              {signedIn ? 'My dashboard' : 'Join now'}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-section relative isolate overflow-hidden bg-ink-950 pt-32 pb-40 text-white sm:pt-40 lg:pb-48">
        <div
          data-reveal
          className="hero-light pointer-events-none absolute -top-24 -left-48 -z-10 h-[820px] w-[600px] rotate-[28deg] bg-gradient-to-b from-blue-400/35 via-blue-500/10 to-transparent blur-2xl"
          style={{ clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)' }}
        />
        <div
          data-reveal
          className="hero-light pointer-events-none absolute -top-24 -right-48 -z-10 h-[820px] w-[600px] -rotate-[28deg] bg-gradient-to-b from-violet-400/30 via-violet-500/10 to-transparent blur-2xl"
          style={{ clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)' }}
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,oklch(0.53_0.232_268/0.35),transparent_70%)]" />
        <div
          data-reveal
          className="hero-pitch pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[62%] [mask-image:linear-gradient(to_top,black_35%,transparent)] lg:[mask-composite:intersect] lg:[mask-image:linear-gradient(to_top,black_35%,transparent),linear-gradient(to_right,transparent_15%,black_60%)]"
          style={{ perspective: '900px' }}
        >
          <div
            className="absolute bottom-[-2%] left-1/2 w-[82%] max-w-[1200px] -translate-x-1/2"
            style={{ transform: 'rotateX(56deg)', transformOrigin: '50% 100%' }}
          >
            <SportArt kind="football" className="w-full text-white/[0.22]" />
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div
              data-reveal
              className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime-300 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-lime-300" />
              </span>
              Season {season} · Registrations open
            </div>

            <h1
              data-reveal
              className="hero-title mt-7 font-athletic text-[3.1rem] leading-[0.9] font-extrabold uppercase italic tracking-[-0.005em] sm:text-7xl lg:text-[5.4rem] xl:text-[6.1rem]"
            >
              {HEADLINE.map((line) => (
                <span key={line.text} className="block overflow-hidden pr-3 pb-1">
                  <span className={cn('hero-line block', line.style)}>{line.text}</span>
                </span>
              ))}
            </h1>

            <p data-reveal className="hero-fade mt-7 max-w-xl text-lg leading-relaxed text-white/70">
              {listSports(names)} for every level, from your very first session to match day.
              Train with dedicated coaches, watch yourself improve and compete in the club&apos;s
              colours.
            </p>

            <div data-reveal className="hero-fade mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={joinHref}
                className="group inline-flex h-12 items-center gap-2 rounded-xl bg-lime-300 px-6 text-[15px] font-semibold text-ink-950 shadow-[0_12px_30px_-10px_oklch(0.9_0.19_125/0.6)] transition-all hover:bg-lime-200 active:scale-[0.98]"
              >
                {joinLabel}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#sports"
                className="inline-flex h-12 items-center rounded-xl border border-white/15 bg-white/5 px-6 text-[15px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                Explore our sports
              </a>
            </div>

            <ul
              data-reveal
              className="hero-fade mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60"
            >
              {[`${list.length} sports to choose from`, 'All levels welcome', 'Apply online in minutes'].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="size-4 text-lime-300" />
                    {t}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Member card */}
          <div
            className="hero-stage relative mx-auto w-full max-w-[330px] sm:max-w-[360px] lg:mr-6 lg:ml-auto"
            aria-hidden="true"
          >
            <div data-reveal className="hero-card-wrap">
              <div className="hero-card relative aspect-[5/7] overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-br from-blue-600 via-blue-700 to-violet-900 shadow-[0_40px_80px_-20px_oklch(0.12_0.08_268/0.9)]">
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'repeating-linear-gradient(135deg, oklch(1 0 0 / 0.06) 0 2px, transparent 2px 14px)',
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(26rem circle at var(--gx, 25%) var(--gy, 0%), oklch(1 0 0 / 0.22), transparent 45%)',
                  }}
                />
                <div className="hero-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0" />
                <div className="absolute top-8 -right-14 w-52 rotate-45 bg-lime-300 py-1.5 text-center font-athletic text-sm font-extrabold uppercase tracking-[0.2em] text-ink-950 shadow-lg">
                  Spot open
                </div>
                <span className="pointer-events-none absolute right-4 bottom-[36%] font-athletic text-[10rem] leading-none font-extrabold italic text-white/[0.09]">
                  10
                </span>

                <div className="relative flex h-full flex-col p-6">
                  <div className="flex items-center gap-3">
                    <LogoMark className="size-10" />
                    <div className="leading-tight">
                      <p className="font-athletic text-xl font-extrabold uppercase tracking-[0.14em]">
                        ClubDee
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                        Member · {season}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-200/80">
                      Your sport
                    </p>
                    <div className="mt-1 h-14 overflow-hidden">
                      <ul className="hero-sport-list">
                        {[...names, names[0]].map((n, i) => (
                          <li
                            key={`${n}-${i}`}
                            className="h-14 truncate font-athletic text-5xl leading-[3.5rem] font-extrabold uppercase italic"
                          >
                            {n}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="mt-3 font-display text-lg font-semibold">Your name here</p>
                    <p className="text-sm text-white/60">Apply to activate this card</p>
                    <dl className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-ink-950/35 p-3 backdrop-blur">
                      {[
                        ['Level', 'Any'],
                        ['Coach', 'Yours'],
                        ['Status', 'Open'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                            {k}
                          </dt>
                          <dd
                            className={cn(
                              'mt-0.5 font-athletic text-lg font-bold uppercase',
                              k === 'Status' && 'text-lime-300'
                            )}
                          >
                            {v}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div data-depth="1.2" className="absolute top-14 -left-4 sm:-left-14">
              <div data-reveal className="hero-chip">
                <div className="hero-chip-inner flex items-center gap-3 rounded-2xl bg-white p-3 pr-4 text-ink-950 shadow-2xl shadow-black/30">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <BadgeCheck className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Application approved</p>
                    <p className="text-xs text-gray-500">Welcome to the team!</p>
                  </div>
                </div>
              </div>
            </div>

            <div data-depth="0.8" className="absolute top-[27%] -right-12 hidden sm:block">
              <div data-reveal className="hero-chip">
                <div className="hero-chip-inner flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/90 p-3 pr-4 shadow-2xl shadow-black/40 backdrop-blur">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                    <CalendarDays className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs text-white/55">Next training</p>
                    <p className="text-sm font-semibold">Tuesday · 18:00</p>
                  </div>
                </div>
              </div>
            </div>

            <div data-depth="1.5" className="absolute -bottom-12 -left-10 hidden sm:block">
              <div data-reveal className="hero-chip">
                <div className="hero-chip-inner flex items-center gap-3 rounded-2xl bg-lime-300 p-3 pr-4 text-ink-950 shadow-2xl shadow-black/30">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-ink-950 text-lime-300">
                    <Trophy className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-ink-950/60">Tournament</p>
                    <p className="text-sm font-semibold">You&apos;re in the squad</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Crossing sport bands */}
      <div aria-hidden="true" className="relative z-10 -mt-20 overflow-hidden pt-6 pb-12">
        <div className="relative">
          <div className="absolute inset-x-[-5%] top-1/2 -translate-y-1/2 rotate-[2.5deg] bg-blue-600 py-3 shadow-xl shadow-blue-900/30">
            <div className="marquee-b flex w-max">
              {[0, 1].map((copy) => (
                <ul key={copy} className="flex shrink-0 items-center">
                  {[0, 1, 2].flatMap((r) =>
                    bandItems.map((t) => (
                      <li
                        key={`${copy}-${r}-${t}`}
                        className="flex items-center gap-5 pr-5 font-athletic text-xl font-bold uppercase italic tracking-wide text-white/80"
                      >
                        {t}
                        <span className="size-1.5 rounded-full bg-lime-300" />
                      </li>
                    ))
                  )}
                </ul>
              ))}
            </div>
          </div>
          <div className="relative mx-[-5%] -rotate-2 bg-lime-300 py-4 shadow-2xl shadow-ink-950/30">
            <div className="marquee-a flex w-max">
              {[0, 1].map((copy) => (
                <ul key={copy} className="flex shrink-0 items-center">
                  {[0, 1, 2].flatMap((r) =>
                    bandItems.map((t) => (
                      <li
                        key={`${copy}-${r}-${t}`}
                        className="flex items-center gap-6 pr-6 font-athletic text-2xl font-extrabold uppercase italic tracking-wide text-ink-950 sm:text-3xl"
                      >
                        {t}
                        <svg viewBox="0 0 24 24" className="size-4 fill-current">
                          <path d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" />
                        </svg>
                      </li>
                    ))
                  )}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sports */}
      <section id="sports" className="relative scroll-mt-20 pt-12 pb-24 sm:pb-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="section-head flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className={cn(EYEBROW, 'text-blue-600')}>Our sports</p>
              <h2 className={cn(SECTION_TITLE, 'mt-3 text-5xl text-foreground sm:text-6xl')}>
                Pick your sport.
                <br />
                We&apos;ll do the rest.
              </h2>
            </div>
            <p className="max-w-md text-lg text-muted-foreground">
              Every sport is coached by club staff and open to new members. Choose one when you
              apply, and your coach takes it from there.
            </p>
          </div>

          <div
            className={cn(
              'mt-14 grid gap-5',
              list.length === 4
                ? 'sm:grid-cols-2 xl:grid-cols-4'
                : list.length === 2
                  ? 'sm:grid-cols-2'
                  : 'sm:grid-cols-2 lg:grid-cols-3'
            )}
          >
            {list.map((sport, i) => {
              const kind = sportKind(sport.name);
              const style = SPORT_STYLE[kind];
              return (
                <article
                  key={sport.name}
                  className="sport-card group relative flex flex-col overflow-hidden rounded-3xl bg-ink-950 text-white shadow-xl shadow-ink-950/15 transition-[translate,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-ink-950/25"
                >
                  <div className="relative h-52 overflow-hidden">
                    <div className={cn('absolute inset-0 bg-gradient-to-b to-transparent', style.glow)} />
                    <div className="absolute inset-0 bg-grid-dark opacity-40" />
                    <div className="absolute inset-x-6 top-12 bottom-4 transition-[scale] duration-500 group-hover:scale-[1.04]">
                      <SportArt
                        kind={kind}
                        className="size-full text-white/40 transition-colors duration-500 group-hover:text-white/70"
                      />
                    </div>
                    <span className="absolute top-4 left-5 font-athletic text-lg font-bold text-white/50">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="absolute top-4 right-4 rounded-full bg-lime-300 px-2.5 py-1 text-[11px] font-semibold text-ink-950">
                      Open to new members
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6 pt-5">
                    <h3 className="font-athletic text-4xl font-extrabold uppercase italic">{sport.name}</h3>
                    <p className="mt-2 flex-1 text-[15px] leading-relaxed text-white/65">{style.blurb}</p>
                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="inline-flex items-center gap-2 text-sm text-white/60">
                        <Users className={cn('size-4', style.accent)} />
                        {sport.coaches
                          ? `${sport.coaches} ${sport.coaches === 1 ? 'coach' : 'coaches'}`
                          : 'Club coaches'}
                      </span>
                      <Link
                        href="/register-membership"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-lime-300 transition-colors hover:text-lime-200"
                      >
                        Apply
                        <span className="sr-only"> for {sport.name}</span>
                        <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why ClubDee */}
      <section id="why" className="relative scroll-mt-20 overflow-hidden bg-ink-950 py-24 text-white sm:py-32">
        <div className="pointer-events-none absolute inset-0 bg-ink-radial opacity-80" />
        <div className="pointer-events-none absolute inset-0 bg-grid-dark mask-fade-b opacity-50" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="section-head mx-auto max-w-2xl text-center">
            <p className={cn(EYEBROW, 'text-lime-300')}>Why ClubDee</p>
            <h2 className={cn(SECTION_TITLE, 'mt-3 text-5xl sm:text-6xl')}>
              More than training.
              <br />
              <span className="text-lime-300">A team.</span>
            </h2>
            <p className="mt-5 text-lg text-white/60">
              Here is what you get from the day your membership is approved.
            </p>
          </div>

          <div className="mt-16 grid gap-5 lg:grid-cols-3">
            <div className="why-tile relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 sm:p-8 lg:col-span-2">
              <div className="grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
                <div>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                    <Users className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-semibold">Coaches in your corner</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/60">
                    Every group is led by a club coach who plans your sessions, follows your
                    attendance and records your results.
                  </p>
                </div>
                <figure className="rounded-2xl border border-white/10 bg-ink-900/80 p-5 shadow-2xl shadow-black/30">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-semibold">
                      MB
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Coach&apos;s note</p>
                      <p className="text-xs text-white/45">After Tuesday&apos;s session</p>
                    </div>
                  </div>
                  <blockquote className="mt-4 text-[15px] leading-relaxed text-white/80">
                    &ldquo;Great session today. Your first touch is getting sharper every week, so
                    keep it up!&rdquo;
                  </blockquote>
                </figure>
              </div>
            </div>

            <div className="why-tile relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 sm:p-8">
              <span className="flex size-11 items-center justify-center rounded-xl bg-lime-300/15 text-lime-300">
                <TrendingUp className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold">See yourself improve</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/60">
                Test results and personal bests are saved after every assessment.
              </p>
              <div className="spark relative mt-6">
                <span className="absolute -top-2 right-0 rounded-full bg-lime-300 px-2.5 py-1 text-[11px] font-semibold text-ink-950">
                  New personal best
                </span>
                <svg viewBox="0 0 240 90" className="mt-4 w-full overflow-visible" fill="none">
                  <path d="M0 86h240" stroke="white" strokeOpacity="0.1" />
                  <path
                    className="spark-line"
                    pathLength={1}
                    d="M0 72C26 70 36 60 58 62s40-16 62-14 38-18 60-20 40-16 60-18"
                    stroke="oklch(0.9 0.19 125)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle className="spark-dot" cx="240" cy="10" r="6" fill="oklch(0.9 0.19 125)" />
                  <circle className="spark-dot" cx="240" cy="10" r="11" stroke="oklch(0.9 0.19 125)" strokeOpacity="0.4" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div className="why-tile relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 sm:p-8">
              <span className="flex size-11 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                <Trophy className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold">Compete for the club</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/60">
                Coaches select athletes for tournaments throughout the season. Wear the colours and
                bring home a result.
              </p>
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/70 p-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-lime-300 text-ink-950">
                  <BadgeCheck className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Selected</p>
                  <p className="text-xs text-white/50">Next tournament · Saturday</p>
                </div>
              </div>
            </div>

            <div className="why-tile relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 sm:p-8 lg:col-span-2">
              <div className="grid items-center gap-8 md:grid-cols-[1fr_1.3fr]">
                <div>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
                    <CalendarDays className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-semibold">Never miss a session</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/60">
                    Your schedule, attendance and club announcements are in your member area, on
                    any device.
                  </p>
                </div>
                <div className="week grid grid-cols-7 gap-1.5 sm:gap-2">
                  {WEEK.map((d) => (
                    <div key={d.day} className="flex flex-col items-center gap-2">
                      <span className="text-[11px] font-medium text-white/45">{d.day}</span>
                      <div className="flex h-20 w-full items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
                        {d.slot ? (
                          <span
                            className={cn(
                              'week-chip rounded-lg px-1.5 py-1 text-[10px] font-semibold sm:text-[11px]',
                              d.slot === 'Match' ? 'bg-lime-300 text-ink-950' : 'bg-blue-600 text-white'
                            )}
                          >
                            {d.slot}
                          </span>
                        ) : (
                          <span className="size-1 rounded-full bg-white/20" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to join */}
      <section id="join" className="scroll-mt-20 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="section-head flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className={cn(EYEBROW, 'text-blue-600')}>How to join</p>
              <h2 className={cn(SECTION_TITLE, 'mt-3 text-5xl text-foreground sm:text-6xl')}>
                Three steps to your
                <br />
                first session.
              </h2>
            </div>
            {!signedIn && (
              <Link
                href="/register-membership"
                className="group inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 px-6 text-[15px] font-semibold text-white shadow-brand transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Start my application
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>

          <div className="steps relative mt-16">
            <div className="absolute top-8 right-[16%] left-[16%] hidden h-px bg-border lg:block">
              <div className="steps-line h-full origin-left bg-gradient-to-r from-blue-500 via-violet-500 to-lime-400" />
            </div>
            <ol className="grid gap-6 lg:grid-cols-3 lg:gap-8">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="step relative rounded-3xl border border-border/80 bg-card p-7 shadow-soft lg:border-0 lg:bg-transparent lg:p-0 lg:text-center lg:shadow-none"
                >
                  <span className="relative z-10 inline-flex size-16 items-center justify-center rounded-2xl bg-ink-950 text-lime-300 shadow-lg shadow-ink-950/20">
                    <s.icon className="size-6" />
                  </span>
                  <p className="mt-6 font-athletic text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
                    Step {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground lg:mx-auto lg:max-w-xs">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Member area */}
      <section
        id="members"
        className="members relative scroll-mt-20 overflow-hidden border-y border-border/70 bg-card py-24 sm:py-32"
      >
        <div className="pointer-events-none absolute inset-0 bg-dot-pattern mask-fade-b opacity-60" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <div className="section-head">
              <p className={cn(EYEBROW, 'text-blue-600')}>Your member area</p>
              <h2 className={cn(SECTION_TITLE, 'mt-3 text-5xl text-foreground sm:text-6xl')}>
                Your club,
                <br />
                in your pocket.
              </h2>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                Every member gets a personal space on the ClubDee app, on your phone or your
                computer.
              </p>
            </div>
            <ul className="member-points mt-10 grid gap-4 sm:grid-cols-2">
              {MEMBER_POINTS.map((p) => (
                <li key={p.title} className="member-point flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <p.icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{p.title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-[290px] sm:w-[310px]" aria-hidden="true">
            <div className="absolute -inset-12 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="phone relative rounded-[44px] border border-ink-700 bg-ink-950 p-3 shadow-2xl shadow-ink-950/40">
              <div className="relative overflow-hidden rounded-[34px] bg-background">
                <div className="absolute top-2 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-950" />
                <div className="space-y-3 p-4 pt-11">
                  <div className="phone-item flex items-center justify-between">
                    <div>
                      <p className="font-display text-lg font-semibold text-foreground">Hi Sara</p>
                      <p className="text-xs text-muted-foreground">{names[0]} · U16</p>
                    </div>
                    <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-semibold text-white">
                      SA
                    </span>
                  </div>

                  <div className="phone-item rounded-2xl bg-gradient-to-br from-blue-600 to-violet-700 p-4 text-white shadow-brand">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">
                      Next session
                    </p>
                    <p className="mt-1 font-display text-xl font-semibold">Tuesday · 18:00</p>
                    <p className="text-xs text-white/70">{memberVenue} · with your coach</p>
                  </div>

                  <div className="phone-item grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-card p-3">
                      <svg viewBox="0 0 48 48" className="size-11 -rotate-90">
                        <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="5" className="text-blue-100" />
                        <circle
                          cx="24"
                          cy="24"
                          r="19"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray="119.4"
                          strokeDashoffset="9.6"
                          className="text-blue-600"
                        />
                      </svg>
                      <p className="mt-2 font-display text-lg leading-none font-semibold text-foreground">92%</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Attendance</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <TrendingUp className="size-5" />
                      </span>
                      <p className="mt-2 font-display text-lg leading-none font-semibold text-foreground">4.6 s</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">30 m sprint · PB</p>
                    </div>
                  </div>

                  <div className="phone-item flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Megaphone className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Match moved to Saturday</p>
                      <p className="text-[11px] text-muted-foreground">From your coach · 2 h ago</p>
                    </div>
                  </div>

                  <div className="phone-item flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-700">
                      <Trophy className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">You&apos;re in the squad</p>
                      <p className="text-[11px] text-muted-foreground">Next tournament · Saturday</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-around border-t border-border bg-card/80 px-4 py-3 text-muted-foreground">
                  <CalendarDays className="size-5 text-blue-600" />
                  <CheckCircle2 className="size-5" />
                  <TrendingUp className="size-5" />
                  <Megaphone className="size-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="section-head">
            <p className={cn(EYEBROW, 'text-blue-600')}>FAQ</p>
            <h2 className={cn(SECTION_TITLE, 'mt-3 text-5xl text-foreground sm:text-6xl')}>
              Questions before
              <br />
              you join?
            </h2>
            <p className="mt-5 max-w-sm text-lg text-muted-foreground">
              Everything you need to know about becoming a ClubDee member.
            </p>
          </div>
          <div className="faq divide-y divide-border rounded-3xl border border-border/80 bg-card shadow-soft">
            {FAQ.map((item) => (
              <details key={item.q} className="faq-item group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-left text-[17px] font-semibold text-foreground">
                  {item.q}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-all duration-300 group-open:rotate-45 group-open:border-blue-600 group-open:bg-blue-600 group-open:text-white">
                    <Plus className="size-4" />
                  </span>
                </summary>
                <p className="mt-3 pr-12 text-[15px] leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call */}
      <section className="px-5 pb-24 sm:px-8 sm:pb-32">
        <div className="cta-card relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-ink-950 px-8 py-16 text-white shadow-2xl shadow-ink-950/20 sm:px-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-ink-radial" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'repeating-linear-gradient(135deg, oklch(1 0 0 / 0.035) 0 2px, transparent 2px 16px)',
            }}
          />
          <div className="pointer-events-none absolute top-1/2 -right-24 hidden w-[560px] -translate-y-1/2 rotate-[-8deg] lg:block">
            <SportArt kind="football" className="w-full text-white/[0.12]" />
          </div>
          <div className="relative max-w-2xl">
            <p className={cn(EYEBROW, 'text-lime-300')}>Season {season}</p>
            <h2 className={cn(SECTION_TITLE, 'mt-4 text-5xl sm:text-7xl')}>
              <span className="block overflow-hidden pr-2">
                <span className="cta-line block">Your first session</span>
              </span>
              <span className="block overflow-hidden pr-2">
                <span className="cta-line block text-lime-300">is waiting.</span>
              </span>
            </h2>
            <p className="mt-6 max-w-lg text-lg text-white/65">
              Applications are open for every sport. It takes a few minutes, and the coach of your
              sport reviews every application.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href={joinHref}
                className="group inline-flex h-12 items-center gap-2 rounded-xl bg-lime-300 px-6 text-[15px] font-semibold text-ink-950 transition-all hover:bg-lime-200 active:scale-[0.98]"
              >
                {joinLabel}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!signedIn && (
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center rounded-xl border border-white/20 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Member sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-ink-950 text-sm text-white/55">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo inverted tagline />
            <p className="mt-4 max-w-xs leading-relaxed">
              A multi-sport club for every level. Train, compete and belong.
            </p>
          </div>
          <FooterColumn title="Sports" links={list.map((s) => ({ href: '#sports', label: s.name }))} />
          <FooterColumn
            title="The club"
            links={[
              { href: '#why', label: 'Why ClubDee' },
              { href: '#join', label: 'How to join' },
              { href: '#members', label: 'Member area' },
              { href: '#faq', label: 'FAQ' },
            ]}
          />
          <FooterColumn
            title="Members"
            links={[
              { href: '/login', label: 'Member sign in' },
              { href: '/register-membership', label: 'Apply for membership' },
            ]}
          />
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs sm:flex-row sm:justify-between sm:px-8">
            <p>© {new Date().getFullYear()} ClubDee Sports Club</p>
            <p>Season {season} registrations are open</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="font-athletic text-sm font-bold uppercase tracking-[0.2em] text-white">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            {link.href.startsWith('#') ? (
              <a href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
