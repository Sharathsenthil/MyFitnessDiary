import { useMemo, useState } from 'react';
import { TrendingUp, Download, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { NUMERIC_KEYS, type NumericKey, type ReportRecord } from '../types';
import { useLocalStorage } from '../lib/storage';
import { parseDateStr } from '../lib/dates';
import { cleanRecords, sortRecords, downloadCsv } from '../lib/records';
import { generateInsights } from '../lib/insights';
import { fitnessData } from '../data';
import { ChartCard, type ChartRow, type Series } from '../components/ChartCard';
import { InsightsPanel } from '../components/InsightsPanel';
import { CompareSection } from './CompareSection';

type Range = '5' | '10' | 'all';

const SUMMARY: { key: NumericKey; label: string; unit: string; goodWhen: 'down' | 'up'; dec?: number }[] = [
  { key: 'weight', label: 'Weight', unit: 'KG', goodWhen: 'down' },
  { key: 'bmi', label: 'BMI', unit: '', goodWhen: 'down' },
  { key: 'pbf', label: 'Body Fat %', unit: '%', goodWhen: 'down' },
  { key: 'fat', label: 'Fat Mass', unit: 'KG', goodWhen: 'down' },
  { key: 'muscle', label: 'Muscle Mass', unit: 'KG', goodWhen: 'up' },
  { key: 'smm', label: 'Skeletal Muscle', unit: 'KG', goodWhen: 'up' },
  { key: 'vfi', label: 'Visceral Fat', unit: '', goodWhen: 'down', dec: 0 },
  { key: 'score', label: 'Fitness Score', unit: '', goodWhen: 'up', dec: 0 },
  { key: 'bodyAge', label: 'Body Age', unit: 'yrs', goodWhen: 'down', dec: 0 },
];

const S = (key: NumericKey, name: string, color: string): Series => ({ key, name, color });

export function ProgressTab() {
  const [stored] = useLocalStorage<ReportRecord[]>('progressData', []);
  const [range, setRange] = useState<Range>('all');

  const sorted = useMemo(() => sortRecords(cleanRecords(stored)), [stored]);
  const shown = range === 'all' ? sorted : sorted.slice(-Number(range));

  const data: ChartRow[] = shown.map(r => {
    const row: ChartRow = { date: r.date, label: parseDateStr(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) };
    for (const k of NUMERIC_KEYS) row[k] = r[k] ?? null;
    return row;
  });

  const insights = useMemo(
    () => generateInsights(sorted, fitnessData.weightManagement.targetWeight),
    [sorted]
  );

  if (sorted.length === 0) {
    return (
      <div className="tab-content fade-in">
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <TrendingUp size={48} style={{ margin: '0 auto 1rem', color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Progress Yet</h2>
          <p style={{ color: 'var(--text-muted)' }}>Log a report to start seeing your trends here. 📝</p>
        </div>
      </div>
    );
  }

  const valuesOf = (k: NumericKey) => data.map(d => d[k]).filter((v): v is number => v !== null && v !== undefined);

  return (
    <div className="tab-content fade-in">
      <InsightsPanel insights={insights} />

      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex gap-2 segmented">
          {([['5', 'Last 5'], ['10', 'Last 10'], ['all', 'All Time']] as const).map(([v, l]) => (
            <button key={v} className={`tab-btn ${range === v ? 'active' : ''}`} onClick={() => setRange(v)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>{l}</button>
          ))}
        </div>
        <button className="tab-btn" onClick={() => downloadCsv(sorted)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      <p className="section-note">
        Showing {data.length} report{data.length === 1 ? '' : 's'}
        {data.length > 0 && <> · {data[0].date} → {data[data.length - 1].date}</>}
      </p>

      {/* Change summary */}
      <div className="summary-grid mb-6">
        {SUMMARY.map(m => {
          const v = valuesOf(m.key);
          if (v.length === 0) return null;
          const first = v[0], last = v[v.length - 1], diff = last - first;
          const dec = m.dec ?? 1;
          const improving = diff === 0 ? null : (m.goodWhen === 'down' ? diff < 0 : diff > 0);
          const color = improving === null ? 'var(--text-muted)' : improving ? 'var(--success)' : 'var(--warning)';
          return (
            <div key={m.key} className="glass-panel summary-card">
              <div className="summary-label">{m.label}</div>
              <div className="summary-value">{last.toFixed(dec)}<span className="metric-unit"> {m.unit}</span></div>
              <div className="summary-delta" style={{ color }}>
                {diff === 0 ? <Minus size={14} /> : diff > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                {diff === 0 ? 'No change' : `${Math.abs(diff).toFixed(dec)} ${m.unit}`}
              </div>
              <div className="summary-from">from {first.toFixed(dec)}</div>
            </div>
          );
        })}
      </div>

      <div className="charts-grid">
        <ChartCard title="Weight" icon="⚖️" unit="KG" hint="Total body weight over time." data={data}
          series={[S('weight', 'Weight', '#f43f5e')]} />
        <ChartCard title="BMI" icon="📉" hint="Body Mass Index — healthy range is roughly 18.5 – 24.9." data={data}
          series={[S('bmi', 'BMI', '#ec4899')]} />
        <ChartCard title="Fat vs Muscle" icon="💪" unit="KG" hint="Goal: fat going down while muscle stays steady or rises." data={data}
          series={[S('fat', 'Fat Mass', '#f59e0b'), S('muscle', 'Muscle Mass', '#10b981'), S('smm', 'Skeletal Muscle', '#8b5cf6')]} />
        <ChartCard title="Body Fat %" icon="📊" hint="Percent body fat — fat as a share of total weight. Lower is generally better." data={data}
          series={[S('pbf', 'PBF', '#3b82f6')]} />
        <ChartCard title="Visceral Fat & Trunk Fat" icon="🥓" hint="Visceral fat index (organ fat) and trunk fat mass in KG." data={data}
          series={[S('vfi', 'Visceral Fat Index', '#ef4444'), S('trunkFat', 'Trunk Fat (KG)', '#f97316')]} />
        <ChartCard title="Fitness Score & Body Age" icon="⭐" hint="Higher score and lower body age mean better overall condition." data={data}
          series={[S('score', 'Fitness Score', '#84cc16'), S('bodyAge', 'Body Age', '#06b6d4')]} />
        <ChartCard title="Body Composition" icon="🧪" unit="KG" area hint="Stacked makeup of the body: water, protein, fat and minerals." data={data}
          series={[S('water', 'Water', '#00f2fe'), S('protein', 'Protein', '#4facfe'), S('fat', 'Fat', '#f59e0b'), S('salt', 'Inorganic Salt', '#94a3b8')]} />
        <ChartCard title="Metabolism & Lean Mass" icon="🔥" hint="BMR (Kcal/day) and Fat Free Mass (KG)." data={data}
          series={[S('bmr', 'BMR (Kcal)', '#f43f5e'), S('ffm', 'Fat Free Mass (KG)', '#10b981')]} />
        <ChartCard title="Hydration" icon="💧" hint="Body water % plus intracellular / extracellular water in litres." data={data}
          series={[S('bodyWaterPct', 'Body Water %', '#00b4d8'), S('icw', 'Intracellular (L)', '#4facfe'), S('ecw', 'Extracellular (L)', '#a78bfa')]} />
        <ChartCard title="Segmental Muscle" icon="🦾" unit="KG" hint="Muscle mass per body part." data={data}
          series={[S('raMuscle', 'Right Arm', '#f43f5e'), S('laMuscle', 'Left Arm', '#f59e0b'), S('tMuscle', 'Trunk', '#10b981'), S('rlMuscle', 'Right Leg', '#3b82f6'), S('llMuscle', 'Left Leg', '#8b5cf6')]} />
        <ChartCard title="Segmental Fat" icon="🦵" unit="KG" hint="Fat mass per body part." data={data}
          series={[S('raFat', 'Right Arm', '#f43f5e'), S('laFat', 'Left Arm', '#f59e0b'), S('tFat', 'Trunk', '#10b981'), S('rlFat', 'Right Leg', '#3b82f6'), S('llFat', 'Left Leg', '#8b5cf6')]} />
      </div>

      <CompareSection records={sorted} />
    </div>
  );
}
