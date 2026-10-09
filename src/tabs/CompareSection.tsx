import { fmtDate } from '../lib/dates';
import { useState } from 'react';
import { GitCompare } from 'lucide-react';
import type { NumericKey, ReportRecord } from '../types';
import { sortRecords } from '../lib/records';

export function CompareSection({ records }: { records: ReportRecord[] }) {
  const sorted = sortRecords(records);
  const [date1, setDate1] = useState(sorted.length > 1 ? sorted[sorted.length - 2].date : sorted[0]?.date || '');
  const [date2, setDate2] = useState(sorted.length > 0 ? sorted[sorted.length - 1].date : '');

  const data1: ReportRecord = sorted.find(d => d.date === date1) || sorted[0] || { date: '' };
  const data2: ReportRecord = sorted.find(d => d.date === date2) || sorted[0] || { date: '' };

  // lowerIsBetter: a drop in this metric is an improvement
  const metrics: { label: string; key: NumericKey; lowerIsBetter?: boolean }[] = [
    { label: 'Weight', key: 'weight', lowerIsBetter: true },
    { label: 'Skeletal Muscle', key: 'smm' },
    { label: 'Muscle Mass', key: 'muscle' },
    { label: 'Fat Mass', key: 'fat', lowerIsBetter: true },
    { label: 'Body Fat %', key: 'pbf', lowerIsBetter: true },
    { label: 'BMI', key: 'bmi', lowerIsBetter: true },
    { label: 'Visceral Fat', key: 'vfi', lowerIsBetter: true },
    { label: 'Trunk Fat', key: 'trunkFat', lowerIsBetter: true },
    { label: 'Fitness Score', key: 'score' },
    { label: 'Body Age', key: 'bodyAge', lowerIsBetter: true },
    { label: 'BMR', key: 'bmr' },
    { label: 'Fat Free Mass', key: 'ffm' },
    { label: 'Body Water', key: 'water' },
    { label: 'Protein', key: 'protein' },
    { label: 'Salt', key: 'salt' },
  ];

  if (sorted.length < 2) {
    return (
      <div className="glass-panel mt-8" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
        <GitCompare size={36} style={{ margin: '0 auto 0.75rem', color: 'var(--accent)' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Compare Two Reports</h2>
        <p style={{ color: 'var(--text-muted)' }}>Log at least two reports to compare them side by side.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel mt-8">
      <div className="panel-header">
        <div className="panel-title"><GitCompare size={18} /> ⚖️ Compare Two Reports</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pick any two dates</div>
      </div>

      <div className="compare-selects">
        <select className="input-field" value={date1} onChange={e => setDate1(e.target.value)}>
          {sorted.map(d => <option key={d.date} value={d.date}>{fmtDate(d.date)}</option>)}
        </select>
        <div className="compare-vs">VS</div>
        <select className="input-field" value={date2} onChange={e => setDate2(e.target.value)}>
          {sorted.map(d => <option key={d.date} value={d.date}>{fmtDate(d.date)}</option>)}
        </select>
      </div>

      <div className="compare-table">
        <div className="compare-row compare-head">
          <div>Metric</div>
          <div>{date1}</div>
          <div>{date2}</div>
          <div>Change</div>
        </div>
        {metrics.map(m => {
          const raw1 = data1[m.key], raw2 = data2[m.key];
          if (raw1 === undefined && raw2 === undefined) return null;
          const v1 = raw1 ?? 0;
          const v2 = raw2 ?? 0;
          const diff = v2 - v1;
          const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
          let diffColor = 'var(--text-muted)';
          if (Math.abs(diff) > 0.0001) {
            const improving = m.lowerIsBetter ? diff < 0 : diff > 0;
            diffColor = improving ? 'var(--success)' : 'var(--warning)';
          }
          return (
            <div key={m.key} className="compare-row">
              <div className="compare-label">{m.label}</div>
              <div>{v1.toFixed(1)}</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{v2.toFixed(1)}</div>
              <div style={{ fontWeight: 700, color: diffColor }}>{Math.abs(diff) > 0.0001 ? diffStr : '-'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

