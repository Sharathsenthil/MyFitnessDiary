import type { MuscleTotal } from '../lib/workouts';

export const intensity = (t: number) => (t < 0.34 ? 'Light' : t < 0.67 ? 'Moderate' : 'Heavy');

/** Emoji, name and how much a muscle was worked. Used in the 3D hover box and the flat drawing's readout. */
export function MuscleCard({ info, max }: { info: MuscleTotal; max: number }) {
  return (
    <>
      <strong><span className="muscle-emoji" aria-hidden="true">{info.emoji}</span> {info.label}</strong>
      {info.hits === 0 ? (
        <span>Not worked in this period</span>
      ) : (
        <>
          <span>{info.hits}× · {info.share}% of training · {intensity(info.hits / max)}</span>
          <span className="holo-sources">
            {info.sources.map(s => `${s.name} ×${s.count}`).join(' · ')}
            {info.minutes > 0 && ` · ${Math.round(info.minutes)} min`}
            {info.reps > 0 && ` · ${info.reps} reps`}
          </span>
        </>
      )}
    </>
  );
}
