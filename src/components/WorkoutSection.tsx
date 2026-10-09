import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2, Flame, Timer, Repeat, Activity } from 'lucide-react';
import type { Exercise, MuscleId, ReportRecord, WorkoutEntry, WorkoutSet } from '../types';
import { useLocalStorage } from '../lib/storage';
import { useAuth } from '../lib/auth';
import { toDateStr } from '../lib/dates';
import { MUSCLES, QUICK_IDS, caloriesFor, describeSets, entriesOn, latestWeight, mergeExercises, normName, searchExercises, summarize, type Period } from '../lib/workouts';
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
  const [rawLogs, setLogs] = useLocalStorage<WorkoutEntry[]>('workoutLogs', []);
  const [custom, setCustom] = useLocalStorage<Exercise[]>('customExercises', []);
  const [reports] = useLocalStorage<ReportRecord[]>('progressData', []);
  const [gymDates, setGymDates] = useLocalStorage<string[]>('gymDates', []);
  const [leaveDates, setLeaveDates] = useLocalStorage<string[]>('leaveDates', []);
  const [restDates, setRestDates] = useLocalStorage<string[]>('restDates', []);

  const { list: exercises, alias } = useMemo(() => mergeExercises(custom), [custom]);
  // Older entries of a custom workout that now matches a preset are counted under the preset
  const logs = useMemo(() => rawLogs.map(l => alias.has(l.exerciseId) ? { ...l, exerciseId: alias.get(l.exerciseId)! } : l), [rawLogs, alias]);
  const weight = latestWeight(reports);

  const [date, setDate] = useState(toDateStr(new Date()));
  const [pickedId, setPickedId] = useState<string | null>(QUICK_IDS[0]);
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState('');
  // Counted workouts: sets of reps at a weight, the same for every set or set by set
  const [setCount, setSetCount] = useState('3');
  const [sameWeight, setSameWeight] = useState(true);
  const [shared, setShared] = useState({ reps: '', weight: '' });
  const [rows, setRows] = useState<{ reps: string; weight: string }[]>([]);
  const nSets = Math.min(20, Math.max(1, Math.floor(Number(setCount)) || 1));
  const rowAt = (i: number) => rows[i] ?? { reps: '', weight: '' };
  const patchRow = (i: number, patch: Partial<{ reps: string; weight: string }>) =>
    setRows(r => Array.from({ length: Math.max(r.length, i + 1) }, (_, k) => (k === i ? { ...(r[k] ?? { reps: '', weight: '' }), ...patch } : r[k] ?? { reps: '', weight: '' })));
  const [period, setPeriod] = useState<Period>('week');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', mode: 'time' as Exercise['mode'], muscles: [] as MuscleId[], intensity: '' });

  const picked = exercises.find(e => e.id === pickedId) ?? null;
  const matches = useMemo(() => searchExercises(exercises, query), [exercises, query]);
  const exactMatch = exercises.find(e => normName(e.name) === normName(query));
  // Quick buttons: the usual three, then whatever you logged most recently
  const quick = useMemo(() => {
    const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).map(l => l.exerciseId);
    const ids = [...new Set([...QUICK_IDS, ...recent])].slice(0, 8);
    return ids.map(id => exercises.find(e => e.id === id)).filter((e): e is Exercise => !!e);
  }, [logs, exercises]);

  const pick = (ex: Exercise) => { setPickedId(ex.id); setQuery(''); setAdding(false); };
  const dayEntries = entriesOn(logs, date);
  const summary = useMemo(() => summarize(logs, exercises, period, weight), [logs, exercises, period, weight]);
  const hits = Object.fromEntries(summary.byMuscle.map(m => [m.id, m.hits])) as Record<MuscleId, number>;
  const dayKcal = dayEntries.reduce((s, e) => {
    const ex = exercises.find(x => x.id === e.exerciseId);
    return s + (ex ? caloriesFor(ex, e.amount, weight) : 0);
  }, 0);

  const addEntry = (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !picked) return;
    let entry: WorkoutEntry;
    if (picked.mode === 'time') {
      const n = Number(amount);
      if (!(n > 0)) return;
      entry = { id: `${Date.now()}`, date, exerciseId: picked.id, amount: n };
    } else {
      const sets: WorkoutSet[] = Array.from({ length: nSets }, (_, i) => {
        const r = sameWeight ? shared : rowAt(i);
        return { reps: Math.floor(Number(r.reps)), weight: Math.max(0, Number(r.weight) || 0) };
      });
      if (sets.some(x => !(x.reps > 0))) return;
      entry = { id: `${Date.now()}`, date, exerciseId: picked.id, amount: sets.reduce((t, x) => t + x.reps, 0), sets };
    }
    const next = [...rawLogs, entry];
    // A logged workout means you went to the gym that day
    const gym = gymDates.includes(date) ? gymDates : [...gymDates, date];
    const leave = leaveDates.filter(d => d !== date);
    const rest = restDates.filter(d => d !== date);
    setLogs(next); setGymDates(gym); setLeaveDates(leave); setRestDates(rest);
    save({ workoutLogs: next, gymDates: gym, leaveDates: leave, restDates: rest });
    setAmount('');
    setShared(sh => ({ ...sh, reps: '' })); setRows([]);
  };

  const removeEntry = (id: string) => {
    const next = rawLogs.filter(l => l.id !== id);
    setLogs(next); save({ workoutLogs: next });
  };

  const addExercise = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!isAdmin || !name) return;
    // Same name as an existing workout: use that one instead of creating a duplicate
    const existing = exercises.find(x => normName(x.name) === normName(name));
    if (existing) { pick(existing); setDraft({ name: '', mode: 'time', muscles: [], intensity: '' }); return; }
    const intensity = Number(draft.intensity);
    const ex: Exercise = {
      id: `c${Date.now()}`, name, mode: draft.mode, muscles: draft.muscles,
      ...(draft.mode === 'time' ? { met: intensity > 0 ? intensity : 5 } : { kcalPerRep: intensity > 0 ? intensity : 0.4 }),
    };
    const next = [...custom, ex];
    setCustom(next); save({ customExercises: next });
    pick(ex);
    setDraft({ name: '', mode: 'time', muscles: [], intensity: '' });
  };

  const removeExercise = (id: string) => {
    if (rawLogs.some(l => l.exerciseId === id)) return;
    const next = custom.filter(c => c.id !== id);
    setCustom(next); save({ customExercises: next });
    if (pickedId === id) setPickedId(null);
  };

  const toggleMuscle = (m: MuscleId) =>
    setDraft(d => ({ ...d, muscles: d.muscles.includes(m) ? d.muscles.filter(x => x !== m) : [...d.muscles, m] }));

  const stats = [
    { icon: <Activity size={18} color="#3b82f6" />, label: 'Sessions', value: summary.sessions, unit: '' },
    { icon: <Timer size={18} color="var(--success)" />, label: 'Time', value: fmtMin(summary.minutes), unit: '' },
    { icon: <Repeat size={18} color="var(--accent)" />, label: 'Reps', value: summary.reps, unit: summary.volume > 0 ? `· ${Math.round(summary.volume)} kg` : '' },
    { icon: <Flame size={18} color="var(--warning)" />, label: 'Calories', value: Math.round(summary.kcal), unit: 'kcal' },
  ];

  return (
    <>
      <div className="glass-panel mb-6">
        <div className="chart-card-title">Log a workout</div>
        <p className="chart-card-hint">Pick a workout, enter minutes or reps, and add it to the day.</p>

        <DateField value={date} onChange={setDate} label="Workout date" />

        <label className="field-label" htmlFor="workout-search" style={{ marginTop: '0.9rem' }}>Workout</label>
        <input id="workout-search" className="input-field" autoComplete="off" autoCapitalize="words" maxLength={40}
          placeholder="Type to search, e.g. chest" value={query}
          onChange={e => { setQuery(e.target.value); setAdding(false); }}
          onKeyDown={e => {
            if (e.key !== 'Enter' || !query.trim()) return;
            e.preventDefault();
            if (exactMatch) pick(exactMatch);
            else if (matches[0]) pick(matches[0]);
            else if (isAdmin) { setDraft(d => ({ ...d, name: query.trim() })); setAdding(true); }
          }} />

        {query.trim() ? (
          <ul className="suggest" role="listbox" aria-label="Matching workouts">
            {matches.map(ex => (
              <li key={ex.id}>
                <button type="button" role="option" aria-selected={ex.id === pickedId} onClick={() => pick(ex)}>
                  <span className="suggest-name">{ex.name}</span>
                  <span className="suggest-meta">{ex.mode === 'time' ? 'minutes' : 'reps'}</span>
                </button>
              </li>
            ))}
            {!exactMatch && isAdmin && (
              <li>
                <button type="button" className="suggest-new" onClick={() => { setDraft(d => ({ ...d, name: query.trim() })); setAdding(true); }}>
                  <Plus size={14} /> <span className="suggest-name">Add &ldquo;{query.trim()}&rdquo; as new workout</span>
                </button>
              </li>
            )}
            {matches.length === 0 && !isAdmin && <li className="suggest-empty">No matching workout</li>}
          </ul>
        ) : (
          <div className="chip-row" role="radiogroup" aria-label="Quick workouts">
            {quick.map(ex => (
              <button key={ex.id} type="button" role="radio" aria-checked={ex.id === pickedId}
                className={`chip ${ex.id === pickedId ? 'on' : ''}`} onClick={() => pick(ex)}>
                {ex.name}
              </button>
            ))}
            {picked && !quick.some(q => q.id === picked.id) && <button type="button" role="radio" aria-checked className="chip on">{picked.name}</button>}
          </div>
        )}

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
                  {custom.filter(c => !alias.has(c.id)).map(c => {
                    const used = rawLogs.some(l => l.exerciseId === c.id);
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
          picked?.mode === 'reps' ? (
            <form className="sets-form" onSubmit={addEntry}>
              <div className="sets-head">
                <label className="field-label" htmlFor="set-count">Sets</label>
                <input id="set-count" className="input-field sets-count" type="number" min="1" max="20" step="1" inputMode="numeric"
                  value={setCount} onChange={e => setSetCount(e.target.value)} />
                <label className="check">
                  <input type="checkbox" checked={sameWeight} onChange={e => setSameWeight(e.target.checked)} />
                  <span>Same weight for all sets</span>
                </label>
              </div>
              {sameWeight ? (
                <div className="set-row">
                  <input className="input-field" type="number" min="1" step="1" inputMode="numeric" required placeholder="Reps per set"
                    value={shared.reps} onChange={e => setShared(sh => ({ ...sh, reps: e.target.value }))} />
                  <input className="input-field" type="number" min="0" step="0.5" inputMode="decimal" placeholder="Weight (kg)"
                    value={shared.weight} onChange={e => setShared(sh => ({ ...sh, weight: e.target.value }))} />
                </div>
              ) : Array.from({ length: nSets }, (_, i) => (
                <div className="set-row" key={i}>
                  <span className="set-no">Set {i + 1}</span>
                  <input className="input-field" type="number" min="1" step="1" inputMode="numeric" required placeholder="Reps"
                    value={rowAt(i).reps} onChange={e => patchRow(i, { reps: e.target.value })} />
                  <input className="input-field" type="number" min="0" step="0.5" inputMode="decimal" placeholder="kg"
                    value={rowAt(i).weight} onChange={e => patchRow(i, { weight: e.target.value })} />
                </div>
              ))}
              <p className="section-note" style={{ margin: 0 }}>Leave weight empty for bodyweight moves.</p>
              <button type="submit" className="submit-btn"><Plus size={16} style={{ verticalAlign: '-3px' }} /> Add</button>
            </form>
          ) : (
            <form className="add-row" onSubmit={addEntry}>
              <input className="input-field" type="number" min="1" step="1" inputMode="numeric" required
                placeholder={picked ? 'Minutes' : 'Pick a workout first'} disabled={!picked} value={amount} onChange={e => setAmount(e.target.value)} />
              <button type="submit" className="submit-btn add-btn" disabled={!picked}><Plus size={16} /> Add</button>
            </form>
          )
        ) : <p className="calendar-hint">🔒 View only — log in as admin to add workouts</p>}

        {dayEntries.length > 0 && (
          <ul className="entry-list">
            {dayEntries.map(en => {
              const ex = exercises.find(x => x.id === en.exerciseId);
              if (!ex) return null;
              return (
                <li key={en.id}>
                  <span className="entry-name">{ex.name}{en.sets?.length ? <small className="entry-sub">{describeSets(en.sets)}</small> : null}</span>
                  {!en.sets?.length && <span className="entry-amt">{en.amount} {unitOf(ex)}</span>}
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
                  <span className="entry-amt">{t.exercise.mode === 'time' ? fmtMin(t.amount) : `${t.amount} reps${t.volume > 0 ? ` · ${Math.round(t.volume)} kg` : ''}`}</span>
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
