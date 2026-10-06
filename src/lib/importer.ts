import { NUMERIC_KEYS, type NumericKey, type ReportRecord } from '../types';
import { toDateStr } from './dates';
import { cleanRecord } from './records';

/**
 * Import reports from a scanner/app export. Works on labels, so it copes with the usual
 * InBody / Tanita / Omron style names. Supported inputs: CSV, JSON, or pasted/plain report text.
 */

// Alternate names for each metric (lower-case). The metric's own key is always accepted too.
const ALIASES: Record<NumericKey, string[]> = {
  weight: ['weight', 'body weight', 'wt'],
  fat: ['body fat mass', 'fat mass', 'bfm', 'fat'],
  muscle: ['muscle mass', 'soft lean mass', 'slm', 'muscle'],
  pbf: ['percent body fat', 'body fat percentage', 'body fat %', 'body fat percent', 'pbf', 'bf%'],
  smm: ['skeletal muscle mass', 'skeletal muscle', 'smm'],
  bmr: ['basal metabolic rate', 'bmr'],
  whr: ['waist-hip ratio', 'waist hip ratio', 'whr'],
  ffm: ['fat free mass', 'fat-free mass', 'lean body mass', 'ffm', 'lbm'],
  vfi: ['visceral fat index', 'visceral fat level', 'visceral fat', 'vfl', 'vfi'],
  bmi: ['body mass index', 'bmi'],
  score: ['inbody score', 'fitness score', 'score'],
  bodyAge: ['body age', 'metabolic age'],
  protein: ['protein'],
  water: ['total body water', 'tbw', 'water'],
  salt: ['inorganic salt', 'minerals', 'mineral', 'salt'],
  trunkFat: ['trunk fat mass', 'trunk fat'],
  bodyWaterPct: ['body water %', 'body water percentage', 'total body water %', 'body water percent'],
  icw: ['intracellular water', 'icw'],
  ecw: ['extracellular water', 'ecw'],
  raMuscle: ['right arm muscle', 'ra muscle'],
  laMuscle: ['left arm muscle', 'la muscle'],
  tMuscle: ['trunk muscle', 't muscle'],
  rlMuscle: ['right leg muscle', 'rl muscle'],
  llMuscle: ['left leg muscle', 'll muscle'],
  raFat: ['right arm fat', 'ra fat'],
  laFat: ['left arm fat', 'la fat'],
  tFat: ['trunk fat', 't fat'],
  rlFat: ['right leg fat', 'rl fat'],
  llFat: ['left leg fat', 'll fat'],
};

// "trunk fat" is ambiguous between the whole-body trunk fat mass and the segmental one; prefer the former.
ALIASES.tFat = ['t fat'];

const normalize = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9%]/g, '');

const HEADER_MAP = new Map<string, NumericKey>();
for (const k of NUMERIC_KEYS) {
  HEADER_MAP.set(normalize(k), k);
  for (const a of ALIASES[k]) HEADER_MAP.set(normalize(a), k);
}

/** Accepts 2026-10-05, 05/10/2026, 05-10-2026, 05.10.2026 (day first), or "5 Oct 2026". */
export function parseAnyDate(text: string): string | null {
  const t = text.trim();
  let m = t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(t);
  return !isNaN(d.getTime()) && /[a-z]/i.test(t) ? toDateStr(d) : null;
}

/** Map one object of label -> value onto a report record. */
function fromLabelled(obj: Record<string, unknown>): ReportRecord | null {
  const draft: Record<string, unknown> = {};
  let date: string | null = null;
  let bodyType: string | undefined;
  for (const [label, value] of Object.entries(obj)) {
    const n = normalize(label);
    if (n === 'date' || n === 'time' || n === 'datetime' || n === 'testdate') {
      date = parseAnyDate(String(value ?? ''));
    } else if (n === 'bodytype') {
      bodyType = String(value ?? '').trim() || undefined;
    } else {
      const key = HEADER_MAP.get(n);
      const num = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
      if (key && Number.isFinite(num)) draft[key] = num;
    }
  }
  if (Object.keys(draft).length === 0) return null;
  return cleanRecord({ ...draft, bodyType, date: date ?? toDateStr(new Date()) });
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === ';' || c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);
  return rows;
}

function parseCsv(text: string): ReportRecord[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];
  const header = rows[0];
  return rows.slice(1)
    .map(r => fromLabelled(Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']))))
    .filter((r): r is ReportRecord => r !== null);
}

function parseJson(text: string): ReportRecord[] {
  const data = JSON.parse(text);
  const list: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.progressData) ? data.progressData : [data];
  return list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map(fromLabelled)
    .filter((r): r is ReportRecord => r !== null);
}

/** Free text such as a copied report: finds "Label  value" pairs, longest labels first. */
function parseFreeText(text: string): ReportRecord[] {
  const lower = text.toLowerCase();
  const pairs: [string, NumericKey][] = [];
  for (const k of NUMERIC_KEYS) for (const a of [...ALIASES[k], k.toLowerCase()]) pairs.push([a, k]);
  pairs.sort((a, b) => b[0].length - a[0].length);

  const found: Partial<Record<NumericKey, number>> = {};
  const used: [number, number][] = [];
  for (const [alias, key] of pairs) {
    const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![a-z])${esc}(?![a-z])\\s*(?:\\([^)]*\\))?\\s*[:=\\-]?\\s*(-?\\d+(?:[.,]\\d+)?)`, 'g');
    for (const m of lower.matchAll(re)) {
      const start = m.index!, end = start + m[0].length;
      if (used.some(([s, e]) => start < e && end > s)) continue;
      used.push([start, end]);
      if (found[key] === undefined) found[key] = parseFloat(m[1].replace(',', '.'));
    }
  }
  const body = lower.match(/body type\s*[:=-]?\s*([a-z ]+)/)?.[1]?.trim();
  if (Object.keys(found).length === 0) return [];
  const rec = cleanRecord({
    ...found,
    bodyType: body ? body.replace(/\b\w/g, c => c.toUpperCase()) : undefined,
    date: parseAnyDate(text) ?? toDateStr(new Date()),
  });
  return rec ? [rec] : [];
}

/** Detects the format from the text itself. */
export function parseReportText(text: string): ReportRecord[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith('{') || t.startsWith('[')) {
    try { return parseJson(t); } catch { /* fall through */ }
  }
  const lines = t.split(/\r?\n/);
  const looksTabular = lines.length >= 2 && /[,;\t]/.test(lines[0]) && lines[0].split(/[,;\t]/).length >= 3;
  if (looksTabular) {
    const csv = parseCsv(t);
    if (csv.length) return csv;
  }
  return parseFreeText(t);
}
