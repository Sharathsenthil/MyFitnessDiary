import { useId, useState, type ReactNode } from 'react';
import type { MuscleId } from '../types';
import type { MuscleTotal } from '../lib/workouts';

/*
 * Holographic body: front and back figure drawn as the right half and mirrored for the left.
 * Each muscle is shaded cyan (light) to red (heavy) by how often it was worked; hover or tap one
 * to read how much it was worked.
 */

const W = 200, H = 412;

// Silhouette pieces (right half)
const BODY: string[] = [
  'M100 62 C118 63 140 68 150 84 L148 118 C146 150 140 172 134 196 L132 214 L100 214 Z', // torso
  'M92 46 L92 62 L108 62 L108 46 Z', // neck
  'M146 80 C158 80 166 92 166 112 L162 150 L148 150 L142 108 Z', // upper arm
  'M162 150 L168 196 L172 226 L160 228 L152 196 L150 150 Z', // forearm
  'M162 226 C170 226 176 236 172 246 C166 252 158 244 160 228 Z', // hand
  'M101 214 L136 214 C140 246 136 280 126 306 C124 330 124 350 126 372 L132 396 C126 402 112 402 110 396 L108 372 C106 350 104 330 103 306 C100 280 100 246 101 214 Z', // leg
];

type Shape = { m: MuscleId; node: ReactNode };

const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0): ReactNode =>
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} />;
const path = (d: string): ReactNode => <path d={d} />;
const absBlocks: ReactNode = <>
  {[124, 146, 168].map(y => <rect key={y} x="103" y={y} width="15" height="18" rx="5" />)}
</>;

const FRONT: Shape[] = [
  { m: 'shoulders', node: ell(152, 94, 11, 16, 12) },
  { m: 'chest', node: path('M101 80 C118 76 138 80 146 94 C146 108 132 120 101 118 Z') },
  { m: 'biceps', node: ell(154, 124, 9, 22, 6) },
  { m: 'forearms', node: ell(161, 190, 8, 28, 6) },
  { m: 'abs', node: absBlocks },
  { m: 'quads', node: path('M103 222 C102 250 104 276 110 300 L126 300 C132 280 134 250 133 222 Z') },
  { m: 'calves', node: path('M108 318 C106 340 108 362 112 380 L124 380 C126 360 126 338 124 318 Z') },
];

const BACK: Shape[] = [
  { m: 'shoulders', node: ell(152, 94, 11, 16, 12) },
  { m: 'back', node: path('M101 64 C120 66 140 72 148 88 C146 120 136 150 122 172 L101 190 Z') },
  { m: 'triceps', node: ell(154, 124, 9, 22, 6) },
  { m: 'forearms', node: ell(161, 190, 8, 28, 6) },
  { m: 'glutes', node: path('M101 196 C120 190 138 198 136 224 C128 238 110 238 101 226 Z') },
  { m: 'hamstrings', node: path('M103 240 C102 264 104 286 110 304 L126 304 C132 284 134 262 133 240 Z') },
  { m: 'calves', node: path('M108 316 C102 336 106 362 112 382 L124 382 C130 362 130 336 124 316 Z') },
];

const heat = (t: number) => `hsl(${Math.round(185 - 175 * t)} 100% ${Math.round(58 - 6 * t)}%)`;

function Figure({ title, shapes, byId, max, active, onHover, onPick }: {
  title: string; shapes: Shape[]; byId: Map<MuscleId, MuscleTotal>; max: number;
  active: MuscleId | null; onHover: (m: MuscleId | null) => void; onPick: (m: MuscleId) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const mirror = `translate(${W} 0) scale(-1 1)`;
  const half = (side: 'r' | 'l') => (
    <g transform={side === 'l' ? mirror : undefined}>
      {BODY.map((d, i) => <path key={i} d={d} className="holo-body" fill={`url(#mesh-${uid})`} />)}
      {shapes.map((s, i) => {
        const n = byId.get(s.m)?.hits ?? 0;
        const t = max > 0 ? n / max : 0;
        return (
          <g key={i} className={`holo-muscle ${n ? 'worked' : ''} ${active === s.m ? 'active' : ''}`}
            style={n ? { color: heat(t) } : undefined}
            onPointerEnter={e => { if (e.pointerType === 'mouse') onHover(s.m); }}
            onPointerLeave={e => { if (e.pointerType === 'mouse') onHover(null); }}
            onClick={() => onPick(s.m)}>
            {s.node}
          </g>
        );
      })}
    </g>
  );

  return (
    <figure className="body-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} view of the body, shaded by how often each muscle was worked`}>
        <defs>
          <filter id={`glow-${uid}`} x="-20%" y="-10%" width="140%" height="120%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id={`mesh-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="rgba(34,211,238,0.07)" />
            <rect width="4" height="0.7" fill="rgba(34,211,238,0.28)" />
          </pattern>
          <linearGradient id={`beam-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="0.5" stopColor="#67e8f9" stopOpacity="0.35" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g filter={`url(#glow-${uid})`}>
          <ellipse cx="100" cy="28" rx="16" ry="20" className="holo-body" fill={`url(#mesh-${uid})`} />
          {half('r')}
          {half('l')}
        </g>

        {/* projector rings under the feet */}
        <ellipse cx="100" cy="402" rx="62" ry="7" className="holo-ring" />
        <ellipse cx="100" cy="402" rx="44" ry="4.5" className="holo-ring faint" />

        <rect className="holo-scan" x="0" y="-40" width={W} height="40" fill={`url(#beam-${uid})`}>
          <animate attributeName="y" values={`-40;${H}`} dur="4.5s" repeatCount="indefinite" />
        </rect>
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

const intensity = (t: number) => (t < 0.34 ? 'Light' : t < 0.67 ? 'Moderate' : 'Heavy');

/** Front and back hologram plus a readout for the muscle you hover or tap. */
export function BodyMap({ muscles, max }: { muscles: MuscleTotal[]; max: number }) {
  const [hover, setHover] = useState<MuscleId | null>(null);
  const [selected, setSelected] = useState<MuscleId | null>(null);
  const byId = new Map(muscles.map(m => [m.id, m]));
  const active = hover ?? selected;
  const info = active ? byId.get(active) : null;
  const pick = (m: MuscleId) => setSelected(s => (s === m ? null : m));

  return (
    <div className="holo">
      <div className="body-map">
        <Figure title="Front" shapes={FRONT} byId={byId} max={max} active={active} onHover={setHover} onPick={pick} />
        <Figure title="Back" shapes={BACK} byId={byId} max={max} active={active} onHover={setHover} onPick={pick} />
      </div>

      <div className="holo-readout" aria-live="polite">
        {!info ? (
          <span className="holo-hint">Hover or tap a muscle to see how much it was worked</span>
        ) : info.hits === 0 ? (
          <><strong>{info.label}</strong><span>Not worked in this period</span></>
        ) : (
          <>
            <strong>{info.label}</strong>
            <span>{info.hits}× · {info.share}% of your training · {intensity(info.hits / max)}</span>
            <span className="holo-sources">
              {info.sources.map(s => `${s.name} ×${s.count}`).join(' · ')}
              {info.minutes > 0 && ` · ${Math.round(info.minutes)} min`}
              {info.reps > 0 && ` · ${info.reps} reps`}
            </span>
          </>
        )}
      </div>

      <div className="holo-scale" aria-hidden="true"><span>Light</span><i /><span>Heavy</span></div>
    </div>
  );
}
