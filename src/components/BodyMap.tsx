import type { CSSProperties, ReactNode } from 'react';
import type { MuscleId } from '../types';

type Props = { className: string; style: CSSProperties };
type Shape = { m: MuscleId; el: (p: Props) => ReactNode };

const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0): Shape['el'] =>
  p => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} {...p} />;

const FRONT: Shape[] = [
  { m: 'shoulders', el: ell(26, 50, 9, 8) }, { m: 'shoulders', el: ell(74, 50, 9, 8) },
  { m: 'chest', el: ell(39, 63, 11, 8) }, { m: 'chest', el: ell(61, 63, 11, 8) },
  { m: 'biceps', el: ell(18, 72, 5.5, 12, 6) }, { m: 'biceps', el: ell(82, 72, 5.5, 12, -6) },
  { m: 'forearms', el: ell(14, 98, 5, 13, 6) }, { m: 'forearms', el: ell(86, 98, 5, 13, -6) },
  { m: 'abs', el: p => <rect x="41" y="75" width="18" height="36" rx="6" {...p} /> },
  { m: 'quads', el: ell(40, 150, 9, 26, 3) }, { m: 'quads', el: ell(60, 150, 9, 26, -3) },
  { m: 'calves', el: ell(38, 205, 6, 17) }, { m: 'calves', el: ell(62, 205, 6, 17) },
];

const BACK: Shape[] = [
  { m: 'shoulders', el: ell(26, 50, 9, 8) }, { m: 'shoulders', el: ell(74, 50, 9, 8) },
  { m: 'back', el: p => <path d="M36 50 L64 50 L60 98 L40 98 Z" {...p} /> },
  { m: 'triceps', el: ell(18, 72, 5.5, 12, 6) }, { m: 'triceps', el: ell(82, 72, 5.5, 12, -6) },
  { m: 'forearms', el: ell(14, 98, 5, 13, 6) }, { m: 'forearms', el: ell(86, 98, 5, 13, -6) },
  { m: 'glutes', el: ell(41, 121, 10, 9) }, { m: 'glutes', el: ell(59, 121, 10, 9) },
  { m: 'hamstrings', el: ell(40, 152, 8.5, 23, 3) }, { m: 'hamstrings', el: ell(60, 152, 8.5, 23, -3) },
  { m: 'calves', el: ell(38, 205, 6, 17) }, { m: 'calves', el: ell(62, 205, 6, 17) },
];

function Figure({ title, shapes, hits, max }: { title: string; shapes: Shape[]; hits: Record<MuscleId, number>; max: number }) {
  return (
    <figure className="body-fig">
      <svg viewBox="0 0 100 230" role="img" aria-label={`${title} view of the body`}>
        <g className="body-base">
          <circle cx="50" cy="16" r="11" />
          <rect x="45" y="26" width="10" height="9" rx="3" />
          <rect x="29" y="38" width="42" height="80" rx="14" />
          <rect x="9" y="42" width="15" height="34" rx="7" transform="rotate(6 16 59)" />
          <rect x="76" y="42" width="15" height="34" rx="7" transform="rotate(-6 84 59)" />
          <rect x="6" y="74" width="14" height="42" rx="6" transform="rotate(6 13 95)" />
          <rect x="80" y="74" width="14" height="42" rx="6" transform="rotate(-6 87 95)" />
          <rect x="30" y="112" width="19" height="104" rx="9" />
          <rect x="51" y="112" width="19" height="104" rx="9" />
        </g>
        {shapes.map((s, i) => {
          const n = hits[s.m] ?? 0;
          const t = max > 0 ? n / max : 0;
          return <g key={i}>{s.el({ className: n ? 'muscle hit' : 'muscle', style: n ? { opacity: 0.35 + 0.65 * t } : {} })}</g>;
        })}
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

/** Front and back figure; each muscle is shaded by how many times it was worked. */
export function BodyMap({ hits, max }: { hits: Record<MuscleId, number>; max: number }) {
  return (
    <div className="body-map">
      <Figure title="Front" shapes={FRONT} hits={hits} max={max} />
      <Figure title="Back" shapes={BACK} hits={hits} max={max} />
    </div>
  );
}
