import {
  ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line,
  XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from 'recharts';
import type { NumericKey } from '../types';

export type ChartRow = { date: string; label: string } & Partial<Record<NumericKey, number | null>>;
export type Series = { key: NumericKey; name: string; color: string };

export function ChartCard({ title, icon, hint, data, series, area = false, unit = '' }: {
  title: string; icon: string; hint: string; data: ChartRow[]; series: Series[]; area?: boolean; unit?: string;
}) {
  // Only draw series that have at least one value in the selected range
  const active = series.filter(sr => data.some(d => d[sr.key] !== null && d[sr.key] !== undefined));
  if (active.length === 0) return null;
  // A stacked chart needs every layer; reports missing one of them would draw a false ramp from zero.
  const rows = area ? data.filter(d => active.every(sr => d[sr.key] !== null && d[sr.key] !== undefined)) : data;
  if (rows.length === 0) return null;
  const Chart = (area ? AreaChart : LineChart) as typeof LineChart;
  return (
    <div className="glass-panel chart-card">
      <div className="chart-card-title">{icon} {title}{unit && <span className="metric-unit"> ({unit})</span>}</div>
      <p className="chart-card-hint">{hint}{rows.length === 1 && ' · Add more reports to see a trend line.'}</p>
      <div className="line-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={rows} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} domain={area ? [0, 'auto'] : ['auto', 'auto']} width={46} />
            <RechartsTooltip
              labelFormatter={(_l, p) => p?.[0]?.payload?.date ?? ''}
              contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-main)', padding: '6px 10px', fontSize: 12 }}
              labelStyle={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}
              itemStyle={{ fontSize: 12, padding: '1px 0' }}
              wrapperStyle={{ zIndex: 10 }}
            />
            <Legend iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
            {active.map(sr => area
              ? <Area key={sr.key} type="monotone" dataKey={sr.key} name={sr.name} stroke={sr.color} fill={sr.color} fillOpacity={0.25} stackId="1" connectNulls />
              : <Line key={sr.key} type="monotone" dataKey={sr.key} name={sr.name} stroke={sr.color} strokeWidth={2} dot={rows.length > 12 ? false : { r: 2 }} activeDot={{ r: 4 }} connectNulls />
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
