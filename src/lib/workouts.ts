import type { Exercise, MuscleId, ReportRecord, WorkoutEntry } from '../types';
import { addDays, parseDateStr, toDateStr } from './dates';

export const MUSCLES: { id: MuscleId; label: string }[] = [
  { id: 'chest', label: 'Chest' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'abs', label: 'Abs' },
  { id: 'back', label: 'Back' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'calves', label: 'Calves' },
];

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'warmup', name: 'Warm-up', mode: 'time', muscles: [], met: 3.5, builtin: true },
  { id: 'treadmill', name: 'Treadmill', mode: 'time', muscles: ['quads', 'hamstrings', 'calves', 'glutes'], met: 8, builtin: true },
  { id: 'cycling', name: 'Cycling', mode: 'time', muscles: ['quads', 'hamstrings', 'glutes', 'calves'], met: 7.5, builtin: true },
];

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

export type Period = 'week' | 'month' | 'all';

/** Inclusive [from, to] date strings, or null for all time. Weeks run Monday to Sunday. */
export function periodRange(period: Period, today = new Date()): [string, string] | null {
  if (period === 'all') return null;
  if (period === 'week') {
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    return [toDateStr(monday), toDateStr(addDays(monday, 6))];
  }
  return [toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)), toDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0))];
}

export interface ExerciseTotal { exercise: Exercise; amount: number; sessions: number; kcal: number }
export interface MuscleTotal { id: MuscleId; label: string; hits: number }
export interface WorkoutSummary {
  days: number;
  sessions: number;
  minutes: number;
  reps: number;
  kcal: number;
  byExercise: ExerciseTotal[];
  byMuscle: MuscleTotal[];
  maxHits: number;
}

export function summarize(entries: WorkoutEntry[], exercises: Exercise[], period: Period, weightKg: number, today = new Date()): WorkoutSummary {
  const range = periodRange(period, today);
  const byId = new Map(exercises.map(e => [e.id, e]));
  const inRange = entries.filter(e => !range || (e.date >= range[0] && e.date <= range[1]));

  const totals = new Map<string, ExerciseTotal>();
  const hits = new Map<MuscleId, number>();
  const days = new Set<string>();
  let minutes = 0, reps = 0, kcal = 0;

  for (const entry of inRange) {
    const ex = byId.get(entry.exerciseId);
    if (!ex) continue;
    days.add(entry.date);
    const cal = caloriesFor(ex, entry.amount, weightKg);
    kcal += cal;
    if (ex.mode === 'time') minutes += entry.amount; else reps += entry.amount;
    const t = totals.get(ex.id) ?? { exercise: ex, amount: 0, sessions: 0, kcal: 0 };
    t.amount += entry.amount; t.sessions++; t.kcal += cal;
    totals.set(ex.id, t);
    for (const m of ex.muscles) hits.set(m, (hits.get(m) ?? 0) + 1);
  }

  const byMuscle = MUSCLES.map(m => ({ ...m, hits: hits.get(m.id) ?? 0 }));
  return {
    days: days.size,
    sessions: [...totals.values()].reduce((s, t) => s + t.sessions, 0),
    minutes, reps, kcal,
    byExercise: [...totals.values()].sort((a, b) => b.kcal - a.kcal),
    byMuscle,
    maxHits: Math.max(0, ...byMuscle.map(m => m.hits)),
  };
}

export const entriesOn = (entries: WorkoutEntry[], date: string) => entries.filter(e => e.date === date);
export const parseDay = parseDateStr;
