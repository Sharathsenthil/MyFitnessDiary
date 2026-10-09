import { Suspense, lazy, useId, useState, type ReactNode } from 'react';
import type { Gender, MuscleId } from '../types';
import type { MuscleTotal } from '../lib/workouts';
import { MuscleCard } from './MuscleCard';

// The 3D viewer (three.js) is loaded only when the body is shown
const Body3D = lazy(() => import('./Body3D'));

/*
 * Holographic body, front and back, male or female. The outline is one smooth contour built from the
 * right half and mirrored; fine scan lines, a glowing rim and a moving scan band give the hologram look.
 * Muscles are shaded light (blue) to heavy (red) by how often they were worked; hover or tap one to read it.
 */

const W = 200, H = 420;

type Seg = [number, number, number, number, number, number]; // c1, c2, end
type Half = { start: [number, number]; segs: Seg[] };

// Right half of the outline, from the top of the head down to the crotch (x = 100 is the centre line)
const MALE: Half = {
  start: [100, 4],
  segs: [
    [113, 4, 121, 17, 121, 30], [121, 40, 117, 50, 111, 52], [110, 55, 108, 57, 108, 60], [108, 62, 108, 65, 109, 68],
    [122, 70, 134, 73, 142, 80], [150, 80, 156, 90, 156, 100], [158, 112, 163, 128, 166, 140], [169, 155, 176, 176, 180, 192],
    [182, 198, 186, 206, 186, 214], [187, 222, 185, 230, 180, 232], [174, 232, 170, 216, 171, 198], [162, 182, 158, 160, 156, 142],
    [153, 128, 144, 112, 136, 102], [134, 116, 136, 134, 134, 150], [132, 160, 130, 175, 131, 186], [133, 196, 140, 204, 138, 214],
    [139, 244, 136, 268, 134, 290], [136, 308, 133, 318, 131, 332], [130, 354, 126, 376, 124, 392], [126, 402, 132, 408, 136, 411],
    [130, 414, 120, 414, 116, 411], [114, 404, 112, 400, 112, 394], [112, 370, 106, 330, 108, 300], [110, 268, 102, 248, 100, 226],
  ],
};

const FEMALE: Half = {
  start: [100, 6],
  segs: [
    [112, 6, 119, 18, 119, 31], [119, 41, 115, 50, 110, 53], [109, 56, 107, 58, 107, 61], [107, 63, 107, 66, 108, 69],
    [118, 71, 128, 74, 136, 81], [142, 82, 146, 90, 146, 100], [148, 112, 152, 126, 155, 140], [157, 154, 164, 172, 168, 190],
    [171, 196, 173, 203, 173, 210], [174, 218, 172, 226, 168, 228], [162, 228, 159, 212, 160, 198], [152, 178, 148, 160, 146, 142],
    [143, 126, 136, 112, 129, 104], [127, 112, 132, 118, 131, 128], [130, 142, 125, 160, 124, 172], [123, 188, 140, 198, 147, 214],
    [150, 238, 140, 266, 134, 290], [136, 306, 133, 318, 131, 332], [130, 354, 126, 376, 124, 392], [126, 402, 132, 408, 136, 411],
    [130, 414, 120, 414, 116, 411], [114, 404, 112, 400, 112, 394], [112, 370, 106, 330, 108, 300], [110, 268, 102, 248, 100, 228],
  ],
};

/** Closed outline: the right half forward, then its mirror image back up to the start. */
function outline({ start, segs }: Half): string {
  const m = (x: number) => W - x;
  let d = `M${start[0]} ${start[1]}`;
  for (const [a, b, c, e, x, y] of segs) d += ` C${a} ${b} ${c} ${e} ${x} ${y}`;
  const pts = [start, ...segs.map(s => [s[4], s[5]] as [number, number])];
  for (let i = segs.length - 1; i >= 0; i--) {
    const [a, b, c, e] = segs[i];
    d += ` C${m(c)} ${e} ${m(a)} ${b} ${m(pts[i][0])} ${pts[i][1]}`;
  }
  return d + ' Z';
}

const OUTLINES: Record<Gender, string> = { male: outline(MALE), female: outline(FEMALE) };

type Shape = { m: MuscleId; node: ReactNode };
const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0): ReactNode =>
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} />;
const path = (d: string): ReactNode => <path d={d} />;
const absBlocks: ReactNode = <>{[128, 150, 172].map(y => <rect key={y} x="103" y={y} width="15" height="19" rx="6" />)}</>;

// Right-half muscle shapes, mirrored for the left. They are clipped to the body, so they never spill out.
const FRONT: Shape[] = [
  { m: 'shoulders', node: ell(146, 94, 13, 17, 15) },
  { m: 'chest', node: path('M101 82 C116 78 134 82 142 98 C140 112 124 122 101 120 Z') },
  { m: 'biceps', node: ell(156, 122, 9, 21, -14) },
  { m: 'forearms', node: ell(169, 168, 8, 27, -16) },
  { m: 'abs', node: absBlocks },
  { m: 'quads', node: path('M103 230 C104 258 108 284 114 300 L132 298 C137 276 138 250 136 224 Z') },
  { m: 'calves', node: path('M114 320 C112 346 115 372 119 388 L126 386 C130 366 131 342 129 322 Z') },
];

const BACK: Shape[] = [
  { m: 'shoulders', node: ell(146, 94, 13, 17, 15) },
  { m: 'back', node: path('M101 70 C120 72 138 80 142 98 C140 128 130 156 118 176 L101 186 Z') },
  { m: 'triceps', node: ell(156, 122, 9, 21, -14) },
  { m: 'forearms', node: ell(169, 168, 8, 27, -16) },
  { m: 'glutes', node: path('M101 192 C122 186 142 194 140 214 C132 230 112 232 101 226 Z') },
  { m: 'hamstrings', node: path('M103 238 C104 262 108 284 114 302 L132 300 C137 278 138 256 136 234 Z') },
  { m: 'calves', node: path('M112 318 C108 342 113 370 119 390 L127 388 C132 366 132 340 129 320 Z') },
];

// Light = blue, heavy = red
const heat = (t: number) => `hsl(${Math.round(205 - 205 * t)} 100% ${Math.round(62 - 8 * t)}%)`;

function Figure({ title, gender, shapes, byId, max, active, onHover, onPick }: {
  title: string; gender: Gender; shapes: Shape[]; byId: Map<MuscleId, MuscleTotal>; max: number;
  active: MuscleId | null; onHover: (m: MuscleId | null) => void; onPick: (m: MuscleId) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const mirror = `translate(${W} 0) scale(-1 1)`;
  // Female proportions are a little narrower at the shoulders
  const fit = gender === 'female' ? `translate(100 0) scale(0.93 1) translate(-100 0)` : undefined;

  const half = (side: 'r' | 'l') => (
    <g transform={side === 'l' ? mirror : undefined}>
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
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} view of the ${gender} body, shaded by how often each muscle was worked`}>
        <defs>
          <clipPath id={`clip-${uid}`}><path d={OUTLINES[gender]} /></clipPath>
          <filter id={`glow-${uid}`} x="-25%" y="-10%" width="150%" height="120%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id={`lines-${uid}`} width="4" height="2.6" patternUnits="userSpaceOnUse">
            <rect width="4" height="2.6" fill="rgba(56,140,255,0.16)" />
            <rect width="4" height="0.8" fill="rgba(120,190,255,0.55)" />
          </pattern>
          <linearGradient id={`beam-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#60a5fa" stopOpacity="0" />
            <stop offset="0.5" stopColor="#bfdbfe" stopOpacity="0.4" />
            <stop offset="1" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g filter={`url(#glow-${uid})`}>
          <path d={OUTLINES[gender]} className="holo-body" fill={`url(#lines-${uid})`} />
        </g>
        <g clipPath={`url(#clip-${uid})`}>
          <g transform={fit}>{half('r')}{half('l')}</g>
          <rect className="holo-scan" x="0" y="-50" width={W} height="50" fill={`url(#beam-${uid})`}>
            <animate attributeName="y" values={`-50;${H}`} dur="4.5s" repeatCount="indefinite" />
          </rect>
        </g>

        {/* projector rings under the feet */}
        <ellipse cx="100" cy="414" rx="64" ry="6" className="holo-ring" />
        <ellipse cx="100" cy="414" rx="44" ry="4" className="holo-ring faint" />
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

/** The 3D hologram (hover or tap a muscle for a box with its details), or a flat drawing if 3D is unavailable. */
export function BodyMap({ muscles, max, gender }: { muscles: MuscleTotal[]; max: number; gender: Gender }) {
  const [hover, setHover] = useState<MuscleId | null>(null);
  const [selected, setSelected] = useState<MuscleId | null>(null);
  const byId = new Map(muscles.map(m => [m.id, m]));
  const active = hover ?? selected;
  const info = active ? byId.get(active) : null;
  const pick = (m: MuscleId | null) => setSelected(s => (m === null || s === m ? null : m));
  // Falls back to the flat drawing when WebGL or the model file is unavailable
  const [flat, setFlat] = useState(false);

  return (
    <div className="holo">
      {flat ? (
        <>
          <div className="body-map">
            <Figure title="Front" gender={gender} shapes={FRONT} byId={byId} max={max} active={active} onHover={setHover} onPick={pick} />
            <Figure title="Back" gender={gender} shapes={BACK} byId={byId} max={max} active={active} onHover={setHover} onPick={pick} />
          </div>
          <div className="holo-readout" aria-live="polite">
            {info ? <MuscleCard info={info} max={max} /> : <span className="holo-hint">Hover or tap a muscle to see how much it was worked</span>}
          </div>
        </>
      ) : (
        <Suspense fallback={<div className="holo3d"><div className="holo3d-loading">Loading 3D body…</div></div>}>
          <Body3D gender={gender} muscles={muscles} max={max} onFail={() => setFlat(true)} />
        </Suspense>
      )}

      <div className="holo-scale" aria-hidden="true"><span>Light</span><i /><span>Heavy</span></div>
    </div>
  );
}
