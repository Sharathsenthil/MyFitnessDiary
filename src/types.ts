/** Every numeric metric stored on a fitness report. */
export const NUMERIC_KEYS = [
  'weight', 'fat', 'muscle', 'pbf', 'smm', 'bmr', 'whr', 'ffm', 'vfi', 'bmi',
  'score', 'bodyAge', 'protein', 'water', 'salt', 'trunkFat', 'bodyWaterPct', 'icw', 'ecw',
  'raMuscle', 'laMuscle', 'tMuscle', 'rlMuscle', 'llMuscle',
  'raFat', 'laFat', 'tFat', 'rlFat', 'llFat',
] as const;

export type NumericKey = typeof NUMERIC_KEYS[number];

/** One saved report (a body-composition scan on a given date). Blank metrics are simply absent. */
export interface ReportRecord extends Partial<Record<NumericKey, number>> {
  /** Local date, YYYY-MM-DD */
  date: string;
  bodyType?: string;
}

/** The New Report form holds everything as strings until it is saved. */
export type ReportForm = Record<NumericKey, string> & { date: string; bodyType: string };

export interface UserProfile {
  name: string;
  dob: string;
  height: number;
  gymJoinedDate: string;
}

export interface FitnessResponse {
  personalInfo?: UserProfile;
  progressData?: ReportRecord[];
  gymDates?: string[];
  leaveDates?: string[];
  restDates?: string[];
  workoutLogs?: WorkoutEntry[];
  customExercises?: Exercise[];
}

export type TabId = 'report' | 'daily' | 'new-report' | 'progress';

/** How a calendar day is marked. Unmarked days have no status. */
export type DayStatus = 'gym' | 'leave' | 'rest';

export type MuscleId =
  | 'chest' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'abs'
  | 'back' | 'glutes' | 'quads' | 'hamstrings' | 'calves';

/** A workout you can log: timed (minutes) or counted (reps). */
export interface Exercise {
  id: string;
  name: string;
  mode: 'time' | 'reps';
  muscles: MuscleId[];
  /** Intensity for timed exercises (calories = MET x kg x hours) */
  met?: number;
  /** Calories per rep for counted exercises */
  kcalPerRep?: number;
  builtin?: boolean;
}

/** One set of a counted exercise. Weight 0 means bodyweight. */
export interface WorkoutSet {
  reps: number;
  weight: number;
}

/** One logged workout: minutes for a timed exercise, total reps for a counted one (with its sets when known). */
export interface WorkoutEntry {
  id: string;
  date: string;
  exerciseId: string;
  amount: number;
  sets?: WorkoutSet[];
}
