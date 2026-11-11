export interface LandingSport {
  name: string;
  /** Coaches assigned to this sport, or null when it isn't known. */
  coaches: number | null;
}

export type SportKind =
  | 'football'
  | 'basketball'
  | 'handball'
  | 'swimming'
  | 'athletics'
  | 'net'
  | 'other';

export const FALLBACK_SPORTS: LandingSport[] = [
  { name: 'Football', coaches: null },
  { name: 'Basketball', coaches: null },
  { name: 'Swimming', coaches: null },
];

export function sportKind(name: string): SportKind {
  const n = name.toLowerCase();
  if (n.includes('foot') || n.includes('soccer') || n.includes('futsal')) return 'football';
  if (n.includes('basket')) return 'basketball';
  if (n.includes('hand')) return 'handball';
  if (n.includes('swim') || n.includes('water') || n.includes('aqua')) return 'swimming';
  if (n.includes('athlet') || n.includes('run') || n.includes('track')) return 'athletics';
  if (n.includes('tennis') || n.includes('volley') || n.includes('badminton') || n.includes('padel')) {
    return 'net';
  }
  return 'other';
}

export const SPORT_STYLE: Record<
  SportKind,
  { blurb: string; venue: string; glow: string; accent: string }
> = {
  football: {
    blurb: 'Technique, tactics and team spirit. Sharpen your first touch and play your part on the pitch.',
    venue: 'Pitch 2',
    glow: 'from-emerald-500/35',
    accent: 'text-emerald-300',
  },
  basketball: {
    blurb: 'Footwork, shooting and fast-paced team play. Learn to read the game and own the court.',
    venue: 'Hall 1',
    glow: 'from-orange-500/35',
    accent: 'text-orange-300',
  },
  handball: {
    blurb: 'Quick passing, powerful shots and solid defence. A fast team sport where everyone plays a part.',
    venue: 'Hall 2',
    glow: 'from-amber-500/35',
    accent: 'text-amber-300',
  },
  swimming: {
    blurb: 'From confident first strokes to race starts and turns, coached lane by lane.',
    venue: 'Pool A',
    glow: 'from-sky-500/35',
    accent: 'text-sky-300',
  },
  athletics: {
    blurb: 'Sprints, jumps and throws. Find your event and chase a new personal best.',
    venue: 'Track',
    glow: 'from-rose-500/35',
    accent: 'text-rose-300',
  },
  net: {
    blurb: 'Footwork, serves and match play, with sessions for every level.',
    venue: 'Court 3',
    glow: 'from-lime-400/30',
    accent: 'text-lime-300',
  },
  other: {
    blurb: 'Coached sessions for every level, from your first try to your first competition.',
    venue: 'Main hall',
    glow: 'from-violet-500/35',
    accent: 'text-violet-300',
  },
};
