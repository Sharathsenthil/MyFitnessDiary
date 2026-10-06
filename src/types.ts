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
}

export type TabId = 'report' | 'daily' | 'new-report' | 'progress';

/** How a calendar day is marked. Unmarked days have no status. */
export type DayStatus = 'gym' | 'leave' | 'rest';
