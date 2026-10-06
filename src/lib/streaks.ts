import { addDays, parseDateStr, toDateStr } from './dates';

export interface WeekBar { label: string; days: number }

export interface StreakStats {
  current: number;
  longest: number;
  longestEnd: string | null;
  thisWeek: number;
  /** Gym days in the last 30 days */
  last30: number;
  weeks: WeekBar[];
  /** Average sessions per week since the first logged day (rounded to 1 decimal) */
  perWeek: number;
}

const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

export function computeStreaks(gymDates: string[], today = new Date(), weeksBack = 8): StreakStats {
  const set = new Set(gymDates);
  const days = [...set].sort();
  const todayStr = toDateStr(today);

  // Current streak: consecutive days ending today, or yesterday if today isn't logged yet.
  let cursor = set.has(todayStr) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(toDateStr(cursor))) { current++; cursor = addDays(cursor, -1); }

  // Longest streak anywhere in the history.
  let longest = 0, run = 0, longestEnd: string | null = null;
  for (let i = 0; i < days.length; i++) {
    const prev = i > 0 ? parseDateStr(days[i - 1]) : null;
    run = prev && toDateStr(addDays(prev, 1)) === days[i] ? run + 1 : 1;
    if (run > longest) { longest = run; longestEnd = days[i]; }
  }

  // Weekly bars (Mon-Sun), oldest first.
  const thisMonday = mondayOf(today);
  const weeks: WeekBar[] = [];
  for (let w = weeksBack - 1; w >= 0; w--) {
    const start = addDays(thisMonday, -7 * w);
    let count = 0;
    for (let i = 0; i < 7; i++) if (set.has(toDateStr(addDays(start, i)))) count++;
    weeks.push({ label: start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), days: count });
  }

  let last30 = 0;
  for (let i = 0; i < 30; i++) if (set.has(toDateStr(addDays(today, -i)))) last30++;

  let perWeek = 0;
  if (days.length > 0) {
    const spanDays = Math.max(7, Math.round((today.getTime() - parseDateStr(days[0]).getTime()) / 86400000) + 1);
    perWeek = Math.round((days.length / (spanDays / 7)) * 10) / 10;
  }

  return { current, longest, longestEnd, thisWeek: weeks[weeks.length - 1]?.days ?? 0, last30, weeks, perWeek };
}
