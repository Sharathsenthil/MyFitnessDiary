import type { Exercise, MuscleId, ReportRecord, WorkoutEntry, WorkoutSet } from '../types';
import { addDays, parseDateStr, toDateStr } from './dates';

export const MUSCLES: { id: MuscleId; label: string; emoji: string }[] = [
  { id: 'chest', label: 'Chest', emoji: '🫁' },
  { id: 'shoulders', label: 'Shoulders', emoji: '🏋️' },
  { id: 'biceps', label: 'Biceps', emoji: '💪' },
  { id: 'triceps', label: 'Triceps', emoji: '💪' },
  { id: 'forearms', label: 'Forearms', emoji: '🦾' },
  { id: 'abs', label: 'Abs', emoji: '🔥' },
  { id: 'back', label: 'Back', emoji: '🧗' },
  { id: 'glutes', label: 'Glutes', emoji: '🍑' },
  { id: 'quads', label: 'Quads', emoji: '🦵' },
  { id: 'hamstrings', label: 'Hamstrings', emoji: '🦵' },
  { id: 'calves', label: 'Calves', emoji: '🦶' },
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const time = (name: string, met: number, ...muscles: MuscleId[]): Exercise =>
  ({ id: name === 'Warm-up' ? 'warmup' : slug(name), name, mode: 'time', muscles, met, builtin: true });
const reps = (name: string, kcalPerRep: number, ...muscles: MuscleId[]): Exercise =>
  ({ id: slug(name), name, mode: 'reps', muscles, kcalPerRep, builtin: true });

/** The ones shown as quick buttons; every other preset is found by typing. */
export const QUICK_IDS = ['warmup', 'treadmill', 'cycling'];

export const DEFAULT_EXERCISES: Exercise[] = [
  // Cardio and timed (minutes)
  time('Warm-up', 3.5),
  time('Treadmill', 8, 'quads', 'hamstrings', 'calves', 'glutes'),
  time('Cycling', 7.5, 'quads', 'hamstrings', 'glutes', 'calves'),
  time('Walking', 3.5, 'quads', 'calves', 'glutes'),
  time('Jogging', 7, 'quads', 'hamstrings', 'calves', 'glutes'),
  time('Running', 9.8, 'quads', 'hamstrings', 'calves', 'glutes'),
  time('Elliptical', 5, 'quads', 'hamstrings', 'glutes'),
  time('Rowing machine', 7, 'back', 'biceps', 'quads', 'glutes'),
  time('Stair climber', 8.8, 'quads', 'glutes', 'calves'),
  time('Skipping rope', 11, 'calves', 'shoulders', 'forearms'),
  time('Swimming', 6, 'shoulders', 'back', 'chest', 'quads'),
  time('HIIT', 8, 'quads', 'glutes', 'abs'),
  time('Battle ropes', 10, 'shoulders', 'biceps', 'forearms', 'abs'),
  time('Plank', 3.5, 'abs', 'shoulders'),
  time('Stretching', 2.3),
  time('Cool-down', 2.5),
  // Chest
  reps('Chest press', 0.5, 'chest', 'triceps', 'shoulders'),
  reps('Bench press', 0.5, 'chest', 'triceps', 'shoulders'),
  reps('Incline chest press', 0.5, 'chest', 'shoulders', 'triceps'),
  reps('Incline dumbbell press', 0.5, 'chest', 'shoulders', 'triceps'),
  reps('Decline chest press', 0.5, 'chest', 'triceps'),
  reps('Dumbbell fly', 0.3, 'chest', 'shoulders'),
  reps('Cable crossover', 0.3, 'chest'),
  reps('Pec deck', 0.3, 'chest'),
  reps('Push-ups', 0.32, 'chest', 'triceps', 'shoulders', 'abs'),
  reps('Chest dips', 0.45, 'chest', 'triceps', 'shoulders'),
  // Back
  reps('Lat pulldown', 0.4, 'back', 'biceps'),
  reps('Seated row', 0.4, 'back', 'biceps'),
  reps('Pull-ups', 0.6, 'back', 'biceps', 'forearms'),
  reps('Chin-ups', 0.6, 'back', 'biceps'),
  reps('Bent-over row', 0.5, 'back', 'biceps'),
  reps('Single-arm dumbbell row', 0.4, 'back', 'biceps'),
  reps('T-bar row', 0.5, 'back', 'biceps'),
  reps('Deadlift', 0.8, 'back', 'glutes', 'hamstrings', 'forearms'),
  reps('Back extension', 0.3, 'back', 'glutes', 'hamstrings'),
  reps('Face pull', 0.25, 'shoulders', 'back'),
  reps('Shrugs', 0.3, 'back', 'shoulders', 'forearms'),
  // Shoulders
  reps('Shoulder press', 0.45, 'shoulders', 'triceps'),
  reps('Arnold press', 0.45, 'shoulders', 'triceps'),
  reps('Lateral raise', 0.25, 'shoulders'),
  reps('Front raise', 0.25, 'shoulders'),
  reps('Rear delt fly', 0.25, 'shoulders', 'back'),
  reps('Upright row', 0.35, 'shoulders', 'back'),
  // Biceps and forearms
  reps('Bicep curl', 0.25, 'biceps', 'forearms'),
  reps('Hammer curl', 0.25, 'biceps', 'forearms'),
  reps('Preacher curl', 0.25, 'biceps'),
  reps('Concentration curl', 0.25, 'biceps'),
  reps('Cable curl', 0.25, 'biceps'),
  reps('Wrist curl', 0.15, 'forearms'),
  reps('Reverse curl', 0.2, 'forearms', 'biceps'),
  // Triceps
  reps('Tricep pushdown', 0.25, 'triceps'),
  reps('Skull crushers', 0.3, 'triceps'),
  reps('Overhead tricep extension', 0.25, 'triceps'),
  reps('Close-grip bench press', 0.45, 'triceps', 'chest'),
  reps('Tricep dips', 0.45, 'triceps', 'chest', 'shoulders'),
  reps('Tricep kickback', 0.2, 'triceps'),
  // Abs
  reps('Crunches', 0.15, 'abs'),
  reps('Sit-ups', 0.2, 'abs'),
  reps('Leg raises', 0.2, 'abs'),
  reps('Hanging leg raise', 0.3, 'abs', 'forearms'),
  reps('Russian twist', 0.15, 'abs'),
  reps('Cable crunch', 0.2, 'abs'),
  reps('Ab wheel', 0.3, 'abs', 'shoulders'),
  reps('Mountain climbers', 0.2, 'abs', 'shoulders', 'quads'),
  // Legs and glutes
  reps('Squats', 0.5, 'quads', 'glutes', 'hamstrings'),
  reps('Goblet squat', 0.4, 'quads', 'glutes'),
  reps('Hack squat', 0.5, 'quads', 'glutes'),
  reps('Leg press', 0.5, 'quads', 'glutes', 'hamstrings'),
  reps('Lunges', 0.4, 'quads', 'glutes', 'hamstrings'),
  reps('Bulgarian split squat', 0.5, 'quads', 'glutes'),
  reps('Step-ups', 0.35, 'quads', 'glutes'),
  reps('Leg extension', 0.3, 'quads'),
  reps('Leg curl', 0.3, 'hamstrings'),
  reps('Romanian deadlift', 0.6, 'hamstrings', 'glutes', 'back'),
  reps('Hip thrust', 0.4, 'glutes', 'hamstrings'),
  reps('Glute kickback', 0.2, 'glutes'),
  reps('Calf raises', 0.2, 'calves'),
];

export const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Presets plus your own workouts. A custom workout named like a preset (e.g. an older "Chest press")
 * is folded into the preset so the same workout never appears twice; `alias` maps its old id across.
 */
export function mergeExercises(custom: Exercise[]): { list: Exercise[]; alias: Map<string, string> } {
  const names = new Set(DEFAULT_EXERCISES.map(e => normName(e.name)));
  const byName = new Map(DEFAULT_EXERCISES.map(e => [normName(e.name), e.id]));
  const alias = new Map<string, string>();
  const own: Exercise[] = [];
  for (const c of custom) {
    const key = normName(c.name);
    if (names.has(key)) alias.set(c.id, byName.get(key)!);
    else { own.push(c); names.add(key); byName.set(key, c.id); }
  }
  return { list: [...DEFAULT_EXERCISES, ...own], alias };
}

/** Matches for what has been typed: names starting with it first, then word starts, then anywhere. */
export function searchExercises(list: Exercise[], query: string, limit = 8): Exercise[] {
  const q = normName(query);
  if (!q) return [];
  const rank = (e: Exercise) => {
    const n = normName(e.name);
    if (n.startsWith(q)) return 0;
    if (n.split(/[\s-]+/).some(w => w.startsWith(q))) return 1;
    return n.includes(q) ? 2 : 3;
  };
  return list.filter(e => rank(e) < 3).sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}

const FALLBACK_WEIGHT_KG = 70;

/** Latest recorded body weight, so calories scale to you. */
export function latestWeight(reports: ReportRecord[]): number {
  const withWeight = reports.filter(r => typeof r.weight === 'number' && r.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
  return withWeight.length ? withWeight[withWeight.length - 1].weight! : FALLBACK_WEIGHT_KG;
}

/** Time exercises use MET x kg x hours; rep exercises use kcal per rep (scaled to a 70 kg body). */
export function caloriesFor(ex: Exercise, amount: number, weightKg: number): number {
  if (ex.mode === 'time') return (ex.met ?? 5) * weightKg * (amount / 60);
  return (ex.kcalPerRep ?? 0.4) * amount * (weightKg / FALLBACK_WEIGHT_KG);
}

export type Period = 'week' | 'month' | 'all' | 'custom';

/** Inclusive [from, to] date strings, or null for all time. Weeks run Monday to Sunday. */
export function periodRange(period: Exclude<Period, 'custom'>, today = new Date()): [string, string] | null {
  if (period === 'all') return null;
  if (period === 'week') {
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    return [toDateStr(monday), toDateStr(addDays(monday, 6))];
  }
  return [toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)), toDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0))];
}

export interface ExerciseTotal { exercise: Exercise; amount: number; sessions: number; kcal: number; volume: number; maxWeight: number }
export interface MuscleTotal {
  id: MuscleId;
  label: string;
  emoji: string;
  /** Times this muscle was worked (once per logged workout that targets it) */
  hits: number;
  /** Share of all muscle hits, 0-100 */
  share: number;
  minutes: number;
  reps: number;
  /** Workouts that hit it, most frequent first */
  sources: { name: string; count: number }[];
}
export interface WorkoutSummary {
  days: number;
  sessions: number;
  minutes: number;
  reps: number;
  /** Total kg lifted (reps x weight, summed over every set) */
  volume: number;
  kcal: number;
  byExercise: ExerciseTotal[];
  byMuscle: MuscleTotal[];
  maxHits: number;
}

/** `range` is an inclusive [from, to] pair of dates, or null for everything. */
export function summarize(entries: WorkoutEntry[], exercises: Exercise[], range: [string, string] | null, weightKg: number): WorkoutSummary {
  const byId = new Map(exercises.map(e => [e.id, e]));
  const inRange = entries.filter(e => !range || (e.date >= range[0] && e.date <= range[1]));

  const totals = new Map<string, ExerciseTotal>();
  const hits = new Map<MuscleId, number>();
  const detail = new Map<MuscleId, { minutes: number; reps: number; sources: Map<string, number> }>();
  const days = new Set<string>();
  let minutes = 0, repCount = 0, kcal = 0, volume = 0;

  for (const entry of inRange) {
    const ex = byId.get(entry.exerciseId);
    if (!ex) continue;
    days.add(entry.date);
    const cal = caloriesFor(ex, entry.amount, weightKg);
    kcal += cal;
    if (ex.mode === 'time') minutes += entry.amount; else repCount += entry.amount;
    const t = totals.get(ex.id) ?? { exercise: ex, amount: 0, sessions: 0, kcal: 0, volume: 0, maxWeight: 0 };
    t.amount += entry.amount; t.sessions++; t.kcal += cal;
    const vol = setVolume(entry.sets);
    t.volume += vol; volume += vol;
    t.maxWeight = Math.max(t.maxWeight, ...(entry.sets ?? []).map(x => x.weight));
    totals.set(ex.id, t);
    for (const m of ex.muscles) {
      hits.set(m, (hits.get(m) ?? 0) + 1);
      const d = detail.get(m) ?? { minutes: 0, reps: 0, sources: new Map<string, number>() };
      if (ex.mode === 'time') d.minutes += entry.amount; else d.reps += entry.amount;
      d.sources.set(ex.name, (d.sources.get(ex.name) ?? 0) + 1);
      detail.set(m, d);
    }
  }

  const totalHits = [...hits.values()].reduce((a, b) => a + b, 0);
  const byMuscle: MuscleTotal[] = MUSCLES.map(m => {
    const d = detail.get(m.id);
    const n = hits.get(m.id) ?? 0;
    return {
      ...m, hits: n, share: totalHits ? Math.round((n / totalHits) * 100) : 0,
      minutes: d?.minutes ?? 0, reps: d?.reps ?? 0,
      sources: d ? [...d.sources].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) : [],
    };
  });
  return {
    days: days.size,
    sessions: [...totals.values()].reduce((s, t) => s + t.sessions, 0),
    minutes, reps: repCount, volume, kcal,
    byExercise: [...totals.values()].sort((a, b) => b.kcal - a.kcal),
    byMuscle,
    maxHits: Math.max(0, ...byMuscle.map(m => m.hits)),
  };
}

export const setVolume = (sets?: WorkoutSet[]) => (sets ?? []).reduce((v, x) => v + x.reps * x.weight, 0);

const kg = (w: number) => (w > 0 ? `${+w.toFixed(2)} kg` : 'bodyweight');

/** "3 × 10 @ 40 kg" when every set matches, otherwise each set: "10×40, 8×45 kg". */
export function describeSets(sets: WorkoutSet[]): string {
  const first = sets[0];
  if (sets.every(x => x.reps === first.reps && x.weight === first.weight)) return `${sets.length} × ${first.reps} @ ${kg(first.weight)}`;
  return sets.map(x => `${x.reps}×${x.weight > 0 ? +x.weight.toFixed(2) : 'BW'}`).join(', ') + (sets.some(x => x.weight > 0) ? ' kg' : '');
}

export const entriesOn = (entries: WorkoutEntry[], date: string) => entries.filter(e => e.date === date);
export const parseDay = parseDateStr;
