import { statusInfo } from '../lib/status';

/** A row inside the grouped metric tables. */
export function MetricRow({ label, value, unit, min, max, isHighBad = false, tooltip = '' }: {
  label: string; value: number; unit: string;
  min?: number; max?: number; isHighBad?: boolean; tooltip?: string;
}) {
  const { label: statusLabel, color, badge } = statusInfo(value, min, max, isHighBad);
  return (
    <tr className="metric-row">
      <td>
        {tooltip
          ? <span className="tooltip-container">{label}<span className="tooltip-text">{tooltip}</span></span>
          : label}
      </td>
      <td className="metric-value" style={{ color }}>
        {value} <span className="metric-unit">{unit}</span>
      </td>
      {(min !== undefined && max !== undefined) ? (
        <>
          <td className="metric-range">{min} – {max}</td>
          <td><span className={`badge ${badge}`}>{statusLabel}</span></td>
        </>
      ) : (
        <td colSpan={2} />
      )}
    </tr>
  );
}
