/** Normal / High / Low classification against a reference range. */
export function statusInfo(value: number, min?: number, max?: number, isHighBad = false) {
  if (min === undefined || max === undefined) return { label: '–', color: 'var(--text-muted)', badge: 'badge-neutral' };
  if (value > max) return isHighBad
    ? { label: 'High ⬆', color: 'var(--warning)', badge: 'badge-warning' }
    : { label: 'Above Normal', color: 'var(--success)', badge: 'badge-success' };
  if (value < min) return { label: 'Low ⬇', color: 'var(--warning)', badge: 'badge-warning' };
  return { label: 'Normal ✓', color: 'var(--success)', badge: 'badge-success' };
}

