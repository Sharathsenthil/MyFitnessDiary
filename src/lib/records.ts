import { NUMERIC_KEYS, type ReportRecord } from '../types';
import { parseDateStr } from './dates';

/** Older saves stored blank fields as '' – drop them so every present metric is a real number. */
export function cleanRecord(raw: unknown): ReportRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.date !== 'string' || !r.date) return null;
  const out: ReportRecord = { date: r.date };
  if (typeof r.bodyType === 'string' && r.bodyType) out.bodyType = r.bodyType;
  for (const k of NUMERIC_KEYS) {
    const v = r[k];
    if (v === '' || v === null || v === undefined) continue;
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export const cleanRecords = (list: unknown): ReportRecord[] =>
  (Array.isArray(list) ? list : []).map(cleanRecord).filter((r): r is ReportRecord => r !== null);

export const sortRecords = (list: ReportRecord[]) =>
  [...list].sort((a, b) => parseDateStr(a.date).getTime() - parseDateStr(b.date).getTime());

/** Insert or replace by date, keeping the list sorted. */
export const upsertRecords = (existing: ReportRecord[], incoming: ReportRecord[]) => {
  const dates = new Set(incoming.map(r => r.date));
  return sortRecords([...existing.filter(r => !dates.has(r.date)), ...incoming]);
};

export function downloadCsv(records: ReportRecord[], filename = 'fitness_data.csv') {
  const esc = (v: unknown) => {
    const t = String(v ?? '');
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const keys = ['date', 'bodyType', ...NUMERIC_KEYS] as const;
  const used = keys.filter(k => records.some(r => r[k as keyof ReportRecord] !== undefined));
  const csv = [
    used.join(','),
    ...records.map(r => used.map(k => esc(r[k as keyof ReportRecord])).join(',')),
  ].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
