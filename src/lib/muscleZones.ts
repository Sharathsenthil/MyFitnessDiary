import type { MuscleId } from '../types';

/**
 * Where each muscle sits on the 3D body, in body units: the model is scaled to 1 unit tall with its feet at
 * y = 0 and its front facing +z. A point is described by u = |x| (distance from the centre line, so the left
 * and right sides share one zone), h = height and d = depth (positive = front).
 * Each zone is a soft ellipsoid; `side` limits it to the front (1) or back (-1) of the body.
 */
export interface Zone {
  id: MuscleId;
  c: [number, number, number];
  r: [number, number, number];
  side: 1 | -1 | 0;
}

export const ZONES: Zone[] = [
  { id: 'chest', c: [0.05, 0.77, 0.03], r: [0.075, 0.055, 0.06], side: 1 },
  { id: 'shoulders', c: [0.105, 0.805, 0], r: [0.05, 0.055, 0.08], side: 0 },
  { id: 'biceps', c: [0.135, 0.72, 0], r: [0.05, 0.075, 0.08], side: 1 },
  { id: 'triceps', c: [0.135, 0.72, 0], r: [0.05, 0.075, 0.08], side: -1 },
  { id: 'forearms', c: [0.165, 0.58, 0], r: [0.05, 0.075, 0.08], side: 0 },
  { id: 'abs', c: [0, 0.63, 0.03], r: [0.062, 0.085, 0.07], side: 1 },
  { id: 'back', c: [0.04, 0.74, -0.03], r: [0.095, 0.12, 0.07], side: -1 },
  { id: 'glutes', c: [0.04, 0.45, -0.03], r: [0.065, 0.055, 0.07], side: -1 },
  { id: 'quads', c: [0.06, 0.37, 0.02], r: [0.055, 0.105, 0.08], side: 1 },
  { id: 'hamstrings', c: [0.06, 0.37, -0.02], r: [0.055, 0.105, 0.08], side: -1 },
  { id: 'calves', c: [0.06, 0.17, 0], r: [0.045, 0.105, 0.08], side: 0 },
];

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 0-1 weight of a zone at a point in body units. Matches the GLSL in Body3D. */
export function zoneWeight(z: Zone, x: number, h: number, d: number): number {
  const u = Math.abs(x);
  const q = ((u - z.c[0]) / z.r[0]) ** 2 + ((h - z.c[1]) / z.r[1]) ** 2 + ((d - z.c[2]) / z.r[2]) ** 2;
  let w = Math.min(1, Math.max(0, 1 - q) * 2);
  if (z.side !== 0) w *= smooth(-0.004, 0.012, z.side * d);
  return w;
}

/** The muscle under a point on the body, or null when it is not on one. */
export function muscleAt(x: number, h: number, d: number): MuscleId | null {
  let best: MuscleId | null = null, bestW = 0.2;
  for (const z of ZONES) {
    const w = zoneWeight(z, x, h, d);
    if (w > bestW) { best = z.id; bestW = w; }
  }
  return best;
}
