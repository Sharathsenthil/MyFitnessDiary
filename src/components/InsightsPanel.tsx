import { Sparkles } from 'lucide-react';
import type { Insight } from '../lib/insights';

const TONE_COLOR = { good: 'var(--success)', warn: 'var(--warning)', info: 'var(--text-muted)' } as const;

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="glass-panel mb-6 insights-panel">
      <div className="panel-header">
        <div className="panel-title"><Sparkles size={18} color="var(--accent)" /> What your numbers say</div>
      </div>
      <ul className="insight-list">
        {insights.map((i, idx) => (
          <li key={idx} className="insight-item" style={{ borderLeftColor: TONE_COLOR[i.tone] }}>
            <span className="insight-icon" aria-hidden>{i.icon}</span>
            <div>
              <div className="insight-title">{i.title}</div>
              <div className="insight-text">{i.text}</div>
            </div>
          </li>
        ))}
      </ul>
      <p className="insight-disclaimer">General guidance based on your own trend data, not medical advice.</p>
    </div>
  );
}
