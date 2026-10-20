import { useMemo, useState } from 'react';
import { Scale, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { ReportRecord } from '../types';
import { parseDateStr, fmtDate, daysBetween } from '../lib/dates';
import { fitnessData } from '../data';
import { ChartCard, type ChartRow } from '../components/ChartCard';

type Range = '10' | '30' | 'all';

const bmiCategory = (b: number) =>
  b < 18.5 ? 'Underweight' : b < 25 ? 'Healthy' : b < 30 ? 'Overweight' : 'Obese';

/** Weight and BMI only: every weigh-in, whether or not a full scan was done that day. */
export function WeightProgress({ weighIns }: { weighIns: ReportRecord[] }) {
  const [range, setRange] = useState<Range>('all');
  const shown = range === 'all' ? weighIns : weighIns.slice(-Number(range));
  const target = fitnessData.weightManagement.targetWeight;

  const data: ChartRow[] = useMemo(() => shown.map(r => ({
    date: r.date,
    label: parseDateStr(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    weight: r.weight ?? null,
    bmi: r.bmi ?? null,
  })), [shown]);

  if (weighIns.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <Scale size={40} style={{ margin: '0 auto 1rem', color: 'var(--accent)' }} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>No weigh-ins yet</h2>
        <p style={{ color: 'var(--text-muted)' }}>Log your weight from the New Report tab to track it here.</p>
      </div>
    );
  }

  const first = shown[0], last = shown[shown.length - 1];
  const diff = (last.weight ?? 0) - (first.weight ?? 0);
  const days = Math.max(1, daysBetween(parseDateStr(first.date), parseDateStr(last.date)));
  const perWeek = shown.length > 1 ? (diff / days) * 7 : null;
  const toGoal = (last.weight ?? 0) - target;
  const color = diff === 0 ? 'var(--text-muted)' : diff < 0 ? 'var(--success)' : 'var(--warning)';
  const Arrow = diff === 0 ? Minus : diff > 0 ? ArrowUp : ArrowDown;

  return (
    <>
      <div className="flex gap-2 segmented mb-4">
        {([['10', 'Last 10'], ['30', 'Last 30'], ['all', 'All Time']] as const).map(([v, l]) => (
          <button key={v} className={`tab-btn ${range === v ? 'active' : ''}`} onClick={() => setRange(v)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>{l}</button>
        ))}
      </div>
      <p className="section-note">
        {shown.length} weigh-in{shown.length === 1 ? '' : 's'} · {fmtDate(first.date)} → {fmtDate(last.date)}
      </p>

      <div className="summary-grid mb-6">
        <div className="glass-panel summary-card">
          <div className="summary-label">Current Weight</div>
          <div className="summary-value">{(last.weight ?? 0).toFixed(1)}<span className="metric-unit"> KG</span></div>
          <div className="summary-from">on {fmtDate(last.date)}</div>
        </div>
        <div className="glass-panel summary-card">
          <div className="summary-label">Change</div>
          <div className="summary-value" style={{ color }}><Arrow size={18} /> {Math.abs(diff).toFixed(1)}<span className="metric-unit"> KG</span></div>
          <div className="summary-from">{perWeek === null ? 'Add more weigh-ins' : `${perWeek > 0 ? '+' : '−'}${Math.abs(perWeek).toFixed(2)} kg / week`}</div>
        </div>
        <div className="glass-panel summary-card">
          <div className="summary-label">To Target ({target} KG)</div>
          <div className="summary-value">{toGoal <= 0 ? 'Reached 🎉' : toGoal.toFixed(1)}{toGoal > 0 && <span className="metric-unit"> KG</span>}</div>
          <div className="summary-from">{toGoal > 0 ? 'still to lose' : `${Math.abs(toGoal).toFixed(1)} kg below target`}</div>
        </div>
        {last.bmi !== undefined && (
          <div className="glass-panel summary-card">
            <div className="summary-label">BMI</div>
            <div className="summary-value">{last.bmi.toFixed(1)}</div>
            <div className="summary-from">{bmiCategory(last.bmi)}</div>
          </div>
        )}
      </div>

      <div className="charts-grid">
        <ChartCard title="Weight" icon="⚖️" unit="KG" hint="Every weigh-in." data={data}
          series={[{ key: 'weight', name: 'Weight', color: '#f43f5e' }]} />
        <ChartCard title="BMI" icon="📉" hint="Healthy range is roughly 18.5 – 24.9." data={data}
          series={[{ key: 'bmi', name: 'BMI', color: '#ec4899' }]} />
      </div>

      <div className="glass-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header"><div className="panel-title">📅 Weigh-in Log</div></div>
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Date</th><th>Weight</th><th>Change</th><th>BMI</th></tr></thead>
          <tbody>
            {[...weighIns].reverse().slice(0, 30).map((r, i, arr) => {
              const prev = arr[i + 1];
              const d = prev?.weight !== undefined && r.weight !== undefined ? r.weight - prev.weight : null;
              return (
                <tr key={r.date} className="metric-row">
                  <td className="nowrap">{fmtDate(r.date)}</td>
                  <td className="metric-value">{r.weight} <span className="metric-unit">KG</span></td>
                  <td className="metric-value" style={{ color: d === null || d === 0 ? 'var(--text-muted)' : d < 0 ? 'var(--success)' : 'var(--warning)' }}>
                    {d === null ? '–' : `${d > 0 ? '+' : ''}${d.toFixed(1)}`}
                  </td>
                  <td className="metric-value">{r.bmi !== undefined ? r.bmi.toFixed(1) : '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </>
  );
}
