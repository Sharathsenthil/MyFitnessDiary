import type { ReportRecord } from '../types';
import { daysBetween, parseDateStr } from './dates';

export type InsightTone = 'good' | 'warn' | 'info';
export interface Insight { tone: InsightTone; icon: string; title: string; text: string }

const fmt = (n: number, dec = 1) => String(Number(Math.abs(n).toFixed(dec)));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/**
 * Turns the saved reports into plain-language observations.
 * Compares the latest report with the one closest to 30 days earlier (or the first report if the
 * history is shorter). These are general guides, not medical advice.
 */
export function generateInsights(sorted: ReportRecord[], targetWeight?: number): Insight[] {
  if (sorted.length === 0) return [];
  const latest = sorted[sorted.length - 1];
  const out: Insight[] = [];

  /* ── Snapshot of the latest report (works with a single report) ── */
  if (latest.vfi !== undefined) {
    out.push(latest.vfi > 10
      ? { tone: 'warn', icon: '🫀', title: 'Visceral fat is high', text: `Level ${fmt(latest.vfi)} is above the healthy 1–10 range. Cardio and a small calorie deficit reduce it fastest.` }
      : { tone: 'good', icon: '🫀', title: 'Visceral fat is healthy', text: `Level ${fmt(latest.vfi)} is within the 1–10 healthy range.` });
  }
  if (latest.bmi !== undefined) {
    const b = latest.bmi;
    const cat = b < 18.5 ? 'underweight' : b < 25 ? 'in the healthy range' : b < 30 ? 'overweight' : 'in the obese range';
    const note = latest.muscle !== undefined && latest.weight && latest.muscle / latest.weight > 0.7 && b >= 25
      ? ' Your high muscle share means BMI may overstate how much fat you carry.' : '';
    out.push({ tone: b >= 18.5 && b < 25 ? 'good' : 'info', icon: '📏', title: `BMI ${fmt(b)}`, text: `That is ${cat}.${note}` });
  }
  if (latest.ecw !== undefined && latest.icw !== undefined && latest.ecw + latest.icw > 0) {
    const ratio = latest.ecw / (latest.ecw + latest.icw);
    out.push(ratio > 0.39
      ? { tone: 'warn', icon: '💧', title: 'Possible water retention', text: `Extracellular water is ${(ratio * 100).toFixed(0)}% of body water (usually 36–39%). Check salt, sleep and hydration.` }
      : { tone: 'good', icon: '💧', title: 'Hydration balance looks normal', text: `Extracellular water is ${(ratio * 100).toFixed(0)}% of body water.` });
  }

  if (sorted.length < 2) {
    out.push({ tone: 'info', icon: '📝', title: 'Log one more report', text: 'With two or more reports you will also see trends, pace and goal estimates here.' });
    return out;
  }

  /* ── Trends: latest vs ~30 days ago ── */
  const latestDate = parseDateStr(latest.date);
  const earlier = sorted.slice(0, -1);
  const base = earlier.reduce((best, r) =>
    Math.abs(daysBetween(parseDateStr(r.date), latestDate) - 30) < Math.abs(daysBetween(parseDateStr(best.date), latestDate) - 30) ? r : best);
  const days = Math.max(1, daysBetween(parseDateStr(base.date), latestDate));
  const span = days >= 14 ? `${Math.round(days / 7)} weeks` : plural(days, 'day');
  const delta = (k: 'weight' | 'fat' | 'muscle' | 'pbf' | 'smm' | 'score' | 'bodyAge') =>
    latest[k] !== undefined && base[k] !== undefined ? (latest[k] as number) - (base[k] as number) : null;

  const dFat = delta('fat'), dMus = delta('muscle'), dW = delta('weight'), dPbf = delta('pbf');
  const trend: Insight[] = [];

  if (dFat !== null && dMus !== null) {
    const fatDown = dFat < -0.2, fatUp = dFat > 0.2, musUp = dMus > 0.2, musDown = dMus < -0.2;
    if (fatDown && musUp) trend.push({ tone: 'good', icon: '🏆', title: 'Excellent recomposition', text: `In ${span}: fat down ${fmt(dFat)} kg and muscle up ${fmt(dMus)} kg. This is the best-case result.` });
    else if (fatDown && musDown) trend.push({ tone: 'warn', icon: '⚠️', title: 'Losing muscle with the fat', text: `In ${span}: fat down ${fmt(dFat)} kg but muscle also down ${fmt(dMus)} kg. Eat more protein and keep strength training.` });
    else if (fatDown) trend.push({ tone: 'good', icon: '🔥', title: 'Fat is coming down', text: `Fat mass is down ${fmt(dFat)} kg in ${span} and muscle is holding steady.` });
    else if (fatUp && musUp) trend.push({ tone: 'info', icon: '📈', title: 'Gaining muscle and some fat', text: `In ${span}: muscle up ${fmt(dMus)} kg, fat up ${fmt(dFat)} kg. Normal while bulking; trim calories slightly if fat keeps rising.` });
    else if (fatUp) trend.push({ tone: 'warn', icon: '📈', title: 'Fat mass is rising', text: `Fat is up ${fmt(dFat)} kg in ${span} without muscle gain. Review food intake and activity.` });
    else if (musUp) trend.push({ tone: 'good', icon: '💪', title: 'Muscle is growing', text: `Muscle mass is up ${fmt(dMus)} kg in ${span}.` });
    else if (musDown) trend.push({ tone: 'warn', icon: '💪', title: 'Muscle is dropping', text: `Muscle mass is down ${fmt(dMus)} kg in ${span}. Check protein, sleep and training volume.` });
    else trend.push({ tone: 'info', icon: '➖', title: 'Body composition is steady', text: `Fat and muscle are within 0.2 kg of ${span} ago.` });
  }

  if (dW !== null && Math.abs(dW) >= 0.2) {
    const perWeek = (dW / days) * 7;
    const pace = Math.abs(perWeek);
    const losing = dW < 0;
    let text = `${losing ? 'Down' : 'Up'} ${fmt(dW)} kg in ${span} (${fmt(perWeek, 2)} kg/week).`;
    let tone: InsightTone = 'info';
    if (losing) {
      if (pace > 1) { tone = 'warn'; text += ' That is faster than the usual 0.25–1 kg/week and risks muscle loss.'; }
      else if (pace >= 0.25) { tone = 'good'; text += ' A healthy, sustainable pace.'; }
    }
    trend.push({ tone, icon: '⚖️', title: 'Weight trend', text });

    if (targetWeight && latest.weight !== undefined && losing && latest.weight > targetWeight && pace > 0.05) {
      const left = latest.weight - targetWeight;
      const weeks = Math.ceil(left / pace);
      trend.push({ tone: 'info', icon: '🎯', title: 'Goal estimate', text: `${fmt(left)} kg to your ${targetWeight} kg target. At this pace that is roughly ${plural(weeks, 'week')}.` });
    } else if (targetWeight && latest.weight !== undefined && latest.weight <= targetWeight) {
      trend.push({ tone: 'good', icon: '🎯', title: 'Target weight reached', text: `You are at or below your ${targetWeight} kg target.` });
    }
  }

  if (dPbf !== null && Math.abs(dPbf) >= 0.3) {
    trend.push({ tone: dPbf < 0 ? 'good' : 'warn', icon: '📊', title: 'Body fat percentage', text: `${dPbf < 0 ? 'Down' : 'Up'} ${fmt(dPbf)} points in ${span}.` });
  }
  const dScore = delta('score'), dAge = delta('bodyAge');
  if (dScore !== null && dScore !== 0) {
    trend.push({ tone: dScore > 0 ? 'good' : 'warn', icon: '⭐', title: 'Fitness score', text: `${dScore > 0 ? 'Up' : 'Down'} ${fmt(dScore, 0)} points in ${span}.` });
  }
  if (dAge !== null && dAge !== 0) {
    trend.push({ tone: dAge < 0 ? 'good' : 'warn', icon: '🧬', title: 'Body age', text: `${dAge < 0 ? 'Younger' : 'Older'} by ${fmt(dAge, 0)} year${Math.abs(dAge) === 1 ? '' : 's'} versus ${span} ago.` });
  }

  return [...trend, ...out];
}
