import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2, Flame, Timer, Repeat, Activity, X } from 'lucide-react';
import type { Exercise, MuscleId, ReportRecord, WorkoutEntry } from '../types';
import { useLocalStorage } from '../lib/storage';
import { useAuth } from '../lib/auth';
import { toDateStr } from '../lib/dates';
import { DEFAULT_EXERCISES, MUSCLES, caloriesFor, entriesOn, latestWeight, summarize, type Period } from '../lib/workouts';
import { DateField } from './DateField';
import { BodyMap } from './BodyMap';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)} min`);
const unitOf = (ex: Exercise) => (ex.mode === 'time' ? 'min' : 'reps');

export function WorkoutSection() {
  const { isAdmin, save } = useAuth();
  const [logs, setLogs] = useLocalStorage<WorkoutEntry[]>('workoutLogs', []);
  const [custom, setCustom] = useLocalStorage<Exercise[]>('customExercises', []);
  const [reports] = useLocalStorage<ReportRecord[]>('progressData', []);
  const [gymDates, setGymDates] = useLocalStorage<string[]>('gymDates', []);
  const [leaveDates, setLeaveDates] = useLocalStorage<string[]>('leaveDates', []);
  const [restDates, setRestDates] = useLocalStorage<string[]>('restDates', []);

  const exercises = useMemo(() => [...DEFAULT_EXERCISES, ...custom], [custom]);
  const weight = latestWeight(reports);

  const [date, setDate] = useState(toDateStr(new Date()));
  const [pickedId, setPickedId] = useState(DEFAULT_EXERCISES[0].id);
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<Period>('week');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', mode: 'time' as Exercise['mode'], muscles: [] as MuscleId[], intensity: '' });

  const picked = exercises.find(e => e.id === pickedId) ?? exercises[0];
  const dayEntries = entriesOn(logs, date);
  const summary = useMemo(() => summarize(logs, exercises, period, weight), [logs, exercises, period, weight]);
  const hits = Object.fromEntries(summary.byMuscle.map(m => [m.id, m.hits])) as Record<MuscleId, number>;
  const dayKcal = dayEntries.reduce((s, e) => {
    const ex = exercises.find(x => x.id === e.exerciseId);
    return s + (ex ? caloriesFor(ex, e.amount, weight) : 0);
  }, 0);

  const addEntry = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!isAdmin || !(n > 0)) return;
    const next = [...logs, { id: `${Date.now()}`, date, exerciseId: picked.id, amount: n }];
    // A logged workout means you went to the gym that day
    const gym = gymDates.includes(date) ? gymDates : [...gymDates, date];
    const leave = leaveDates.filter(d => d !== date);
    const rest = restDates.filter(d => d !== date);
    setLogs(next); setGymDates(gym); setLeaveDates(leave); setRestDates(rest);
    save({ workoutLogs: next, gymDates: gym, leaveDates: leave, restDates: rest });
    setAmount('');
  };

  const removeEntry = (id: string) => {
    const next = logs.filter(l => l.id !== id);
    setLogs(next); save({ workoutLogs: next });
  };

  const addExercise = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!isAdmin || !name) return;
    const intensity = Number(draft.intensity);
    const ex: Exercise = {
      id: `c${Date.now()}`, name, mode: draft.mode, muscles: draft.muscles,
      ...(draft.mode === 'time' ? { met: intensity > 0 ? intensity : 5 } : { kcalPerRep: intensity > 0 ? intensity : 0.4 }),
    };
    const next = [...custom, ex];
    setCustom(next); save({ customExercises: next });
    setPickedId(ex.id); setAdding(false);
    setDraft({ name: '', mode: 'time', muscles: [], intensity: '' });
  };

  const removeExercise = (id: string) => {
    if (logs.some(l => l.exerciseId === id)) return;
    const next = custom.filter(c => c.id !== id);
    setCustom(next); save({ customExercises: next });
    if (pickedId === id) setPickedId(DEFAULT_EXERCISES[0].id);
  };

  const toggleMuscle = (m: MuscleId) =>
    setDraft(d => ({ ...d, muscles: d.muscles.includes(m) ? d.muscles.filter(x => x !== m) : [...d.muscles, m] }));

  const stats = [
    { icon: <Activity size={18} color="#3b82f6" />, label: 'Sessions', value: summary.sessions, unit: '' },
    { icon: <Timer size={18} color="var(--success)" />, label: 'Time', value: fmtMin(summary.minutes), unit: '' },
    { icon: <Repeat size={18} color="var(--accent)" />, label: 'Reps', value: summary.reps, unit: '' },
    { icon: <Flame size={18} color="var(--warning)" />, label: 'Calories', value: Math.round(summary.kcal), unit: 'kcal' },
  ];

  return (
    <>
      <div className="glass-panel mb-6">
        <div className="chart-card-title">Log a workout</div>
        <p className="chart-card-hint">Pick a workout, enter minutes or reps, and add it to the day.</p>

        <DateField value={date} onChange={setDate} label="Workout date" />

        <div className="chip-row" role="radiogroup" aria-label="Workout">
          {exercises.map(ex => (
            <button key={ex.id} type="button" role="radio" aria-checked={ex.id === picked.id}
              className={`chip ${ex.id === picked.id ? 'on' : ''}`} onClick={() => setPickedId(ex.id)}>
              {ex.name}
            </button>
          ))}
          {isAdmin && (
            <button type="button" className="chip add" onClick={() => setAdding(a => !a)}>
              {adding ? <X size={14} /> : <Plus size={14} />} New
            </button>
          )}
        </div>

        {isAdmin && adding && (
          <form className="exercise-form" onSubmit={addExercise}>
            <input className="input-field" placeholder="Workout name (e.g. Chest press)" maxLength={40} required
              value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
            <div className="seg">
              {(['time', 'reps'] as const).map(m => (
                <button key={m} type="button" className={`chip ${draft.mode === m ? 'on' : ''}`}
                  onClick={() => setDraft(d => ({ ...d, mode: m, intensity: '' }))}>
                  {m === 'time' ? 'Minutes' : 'Reps'}
                </button>
              ))}
            </div>
            <label className="field-label">Muscles it works</label>
            <div className="chip-row tight">
              {MUSCLES.map(m => (
                <button key={m.id} type="button" className={`chip ${draft.muscles.includes(m.id) ? 'on' : ''}`} onClick={() => toggleMuscle(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
            <input className="input-field" type="number" step="0.1" min="0" inputMode="decimal"
              placeholder={draft.mode === 'time' ? 'Intensity (MET), default 5' : 'Calories per rep, default 0.4'}
              value={draft.intensity} onChange={e => setDraft(d => ({ ...d, intensity: e.target.value }))} />
            <button type="submit" className="submit-btn">Save workout</button>
            {custom.length > 0 && (
              <>
                <label className="field-label">Remove a workout</label>
                <div className="chip-row tight">
                  {custom.map(c => {
                    const used = logs.some(l => l.exerciseId === c.id);
                    return (
                      <button key={c.id} type="button" className="chip danger" disabled={used}
                        title={used ? 'Already logged, so it cannot be removed' : `Remove ${c.name}`} onClick={() => removeExercise(c.id)}>
                        <Trash2 size={13} /> {c.name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </form>
        )}

        {isAdmin ? (
          <form className="add-row" onSubmit={addEntry}>
            <input className="input-field" type="number" min="1" step="1" inputMode="numeric" required
              placeholder={picked.mode === 'time' ? 'Minutes' : 'Reps'} value={amount} onChange={e => setAmount(e.target.value)} />
            <button type="submit" className="submit-btn add-btn"><Plus size={16} /> Add</button>
          </form>
        ) : <p className="calendar-hint">🔒 View only — log in as admin to add workouts</p>}

        {dayEntries.length > 0 && (
          <ul className="entry-list">
            {dayEntries.map(en => {
              const ex = exercises.find(x => x.id === en.exerciseId);
              if (!ex) return null;
              return (
                <li key={en.id}>
                  <span className="entry-name">{ex.name}</span>
                  <span className="entry-amt">{en.amount} {unitOf(ex)}</span>
                  <span className="entry-kcal">{Math.round(caloriesFor(ex, en.amount, weight))} kcal</span>
                  {isAdmin && <button type="button" className="icon-btn" aria-label={`Delete ${ex.name}`} onClick={() => removeEntry(en.id)}><Trash2 size={15} /></button>}
                </li>
              );
            })}
            <li className="entry-total"><span>Day total</span><span>{Math.round(dayKcal)} kcal</span></li>
          </ul>
        )}
      </div>

      <div className="glass-panel mb-6">
        <div className="seg period-seg" role="tablist" aria-label="Report period">
          {PERIODS.map(p => (
            <button key={p.id} type="button" role="tab" aria-selected={period === p.id}
              className={`chip ${period === p.id ? 'on' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>
          ))}
        </div>

        <div className="streak-grid" style={{ marginTop: '1rem' }}>
          {stats.map(c => (
            <div key={c.label} className="streak-card">
              <div className="summary-label">{c.icon} {c.label}</div>
              <div className="summary-value">{c.value}{c.unit && <span className="metric-unit"> {c.unit}</span>}</div>
            </div>
          ))}
        </div>

        {summary.sessions === 0 ? (
          <p className="calendar-hint">No workouts logged for this period yet.</p>
        ) : (
          <>
            <div className="chart-card-title" style={{ marginTop: '1.25rem' }}>Workouts</div>
            <ul className="entry-list">
              {summary.byExercise.map(t => (
                <li key={t.exercise.id}>
                  <span className="entry-name">{t.exercise.name}</span>
                  <span className="entry-amt">{t.exercise.mode === 'time' ? fmtMin(t.amount) : `${t.amount} reps`}</span>
                  <span className="entry-kcal">{Math.round(t.kcal)} kcal</span>
                </li>
              ))}
            </ul>

            <div className="chart-card-title" style={{ marginTop: '1.25rem' }}>Muscles worked</div>
            <p className="chart-card-hint">Darker = worked more often</p>
            <div className="muscle-layout">
              <BodyMap hits={hits} max={summary.maxHits} />
              <ul className="muscle-list">
                {[...summary.byMuscle].sort((a, b) => b.hits - a.hits).map(m => (
                  <li key={m.id}>
                    <span className="muscle-name">{m.label}</span>
                    <span className="muscle-bar"><i style={{ width: `${summary.maxHits ? (m.hits / summary.maxHits) * 100 : 0}%` }} /></span>
                    <span className="muscle-n">{m.hits}×</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}
