import type { ReactElement } from 'react';
import type { SportKind } from './sports';

// pathLength=1 lets GSAP draw every shape with strokeDasharray/offset of 1.
const line = {
  className: 'art-line',
  pathLength: 1,
  vectorEffect: 'non-scaling-stroke',
} as const;

function Football() {
  return (
    <>
      <rect {...line} x="10" y="10" width="300" height="180" rx="4" />
      <line {...line} x1="160" y1="10" x2="160" y2="190" />
      <circle {...line} cx="160" cy="100" r="28" />
      <rect {...line} x="10" y="50" width="48" height="100" />
      <rect {...line} x="262" y="50" width="48" height="100" />
      <rect {...line} x="10" y="78" width="18" height="44" />
      <rect {...line} x="292" y="78" width="18" height="44" />
      <path {...line} d="M58 84a20 20 0 0 1 0 32" />
      <path {...line} d="M262 84a20 20 0 0 0 0 32" />
      <circle cx="160" cy="100" r="2.5" fill="currentColor" />
      <circle cx="42" cy="100" r="2" fill="currentColor" />
      <circle cx="278" cy="100" r="2" fill="currentColor" />
    </>
  );
}

function Basketball() {
  return (
    <>
      <rect {...line} x="10" y="10" width="300" height="180" rx="4" />
      <line {...line} x1="160" y1="10" x2="160" y2="190" />
      <circle {...line} cx="160" cy="100" r="24" />
      <rect {...line} x="10" y="72" width="62" height="56" />
      <rect {...line} x="248" y="72" width="62" height="56" />
      <circle {...line} cx="72" cy="100" r="18" />
      <circle {...line} cx="248" cy="100" r="18" />
      <path {...line} d="M10 26h24a76 76 0 0 1 0 148H10" />
      <path {...line} d="M310 26h-24a76 76 0 0 0 0 148h24" />
      <circle {...line} cx="26" cy="100" r="4" />
      <circle {...line} cx="294" cy="100" r="4" />
    </>
  );
}

function Handball() {
  return (
    <>
      <rect {...line} x="10" y="10" width="300" height="180" rx="4" />
      <line {...line} x1="160" y1="10" x2="160" y2="190" />
      <path {...line} d="M10 44h14a56 56 0 0 1 0 112H10" />
      <path {...line} d="M310 44h-14a56 56 0 0 0 0 112h14" />
      <path {...line} d="M10 22h20a78 78 0 0 1 0 156H10" strokeOpacity="0.5" />
      <path {...line} d="M310 22h-20a78 78 0 0 0 0 156h20" strokeOpacity="0.5" />
      <rect {...line} x="4" y="88" width="6" height="24" />
      <rect {...line} x="310" y="88" width="6" height="24" />
      <circle cx="160" cy="100" r="2.5" fill="currentColor" />
    </>
  );
}

function Swimming() {
  const lanes = [25, 55, 85, 115, 145, 175];
  return (
    <>
      <rect {...line} x="10" y="10" width="300" height="180" rx="8" />
      {[40, 70, 100, 130, 160].map((y) => (
        <line key={`rope-${y}`} {...line} x1="10" y1={y} x2="310" y2={y} />
      ))}
      {lanes.map((y) => (
        <g key={`lane-${y}`}>
          <line {...line} x1="38" y1={y} x2="282" y2={y} />
          <line {...line} x1="38" y1={y - 6} x2="38" y2={y + 6} />
          <line {...line} x1="282" y1={y - 6} x2="282" y2={y + 6} />
        </g>
      ))}
    </>
  );
}

function Athletics() {
  return (
    <>
      <rect {...line} x="10" y="10" width="300" height="180" rx="90" />
      <rect {...line} x="26" y="26" width="268" height="148" rx="74" />
      <rect {...line} x="42" y="42" width="236" height="116" rx="58" />
      <rect {...line} x="58" y="58" width="204" height="84" rx="42" />
      <line {...line} x1="160" y1="10" x2="160" y2="58" />
      <line {...line} x1="160" y1="142" x2="160" y2="190" />
    </>
  );
}

function NetCourt() {
  return (
    <>
      <rect {...line} x="10" y="10" width="300" height="180" rx="4" />
      <line {...line} x1="10" y1="32" x2="310" y2="32" />
      <line {...line} x1="10" y1="168" x2="310" y2="168" />
      <line {...line} x1="92" y1="32" x2="92" y2="168" />
      <line {...line} x1="228" y1="32" x2="228" y2="168" />
      <line {...line} x1="92" y1="100" x2="228" y2="100" />
      <line {...line} x1="160" y1="2" x2="160" y2="198" strokeWidth="3" />
    </>
  );
}

function Other() {
  return (
    <>
      <rect {...line} x="10" y="10" width="300" height="180" rx="24" />
      <line {...line} x1="160" y1="10" x2="160" y2="190" />
      <circle {...line} cx="160" cy="100" r="34" />
      <circle {...line} cx="160" cy="100" r="12" />
    </>
  );
}

const ART: Record<SportKind, () => ReactElement> = {
  football: Football,
  basketball: Basketball,
  handball: Handball,
  swimming: Swimming,
  athletics: Athletics,
  net: NetCourt,
  other: Other,
};

export function SportArt({ kind, className }: { kind: SportKind; className?: string }) {
  const Art = ART[kind];
  return (
    <svg
      viewBox="0 0 320 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <Art />
    </svg>
  );
}
