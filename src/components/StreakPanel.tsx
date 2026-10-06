import { Flame, Trophy, CalendarDays, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import type { StreakStats } from '../lib/streaks';

export function StreakPanel({ stats }: { stats: StreakStats }) {
  const cards = [
    { icon: <Flame size={18} color="var(--warning)" />, label: 'Current streak', value: stats.current, unit: stats.current === 1 ? 'day' : 'days', hint: stats.current > 0 ? 'Keep it going!' : 'Log a gym day to start one' },
    { icon: <Trophy size={18} color="var(--accent)" />, label: 'Longest streak', value: stats.longest, unit: stats.longest === 1 ? 'day' : 'days', hint: stats.longestEnd ? `ended ${stats.longestEnd}` : '—' },
    { icon: <CalendarDays size={18} color="var(--success)" />, label: 'This week', value: stats.thisWeek, unit: '/ 7', hint: 'Mon – Sun' },
    { icon: <Activity size={18} color="#3b82f6" />, label: 'Last 30 days', value: stats.last30, unit: 'days', hint: `${stats.perWeek}/week on average` },
  ];
  return (
    <div className="glass-panel mb-6">
      <div className="streak-grid">
        {cards.map(c => (
          <div key={c.label} className="streak-card">
            <div className="summary-label">{c.icon} {c.label}</div>
            <div className="summary-value">{c.value}<span className="metric-unit"> {c.unit}</span></div>
            <div className="summary-from">{c.hint}</div>
          </div>
        ))}
      </div>
      <div className="chart-card-title" style={{ marginTop: '1.25rem' }}>Gym days per week</div>
      <p className="chart-card-hint">Last {stats.weeks.length} weeks (week starting Monday)</p>
      <div style={{ height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.weeks} margin={{ top: 5, right: 8, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} domain={[0, 7]} allowDecimals={false} />
            <RechartsTooltip
              cursor={{ fill: 'var(--hover-bg)' }}
              formatter={(v) => [`${v} day${v === 1 ? '' : 's'}`, 'Gym']}
              labelFormatter={(l) => `Week of ${l}`}
              contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-main)', padding: '6px 10px', fontSize: 12 }}
            />
            <Bar dataKey="days" fill="var(--accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
