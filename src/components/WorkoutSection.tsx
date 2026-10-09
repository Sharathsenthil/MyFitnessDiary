import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2, Pencil, Flame, Timer, Repeat, Activity, Ban } from 'lucide-react';
import type { Exercise, MuscleId, ReportRecord, UserProfile, WorkoutEntry, WorkoutSet } from '../types';
import { useLocalStorage } from '../lib/storage';
import { useAuth } from '../lib/auth';
import { MUSCLES, QUICK_IDS, caloriesFor, describeSets, entriesOn, latestWeight, mergeExercises, normName, periodRange, searchExercises, summarize, type Period } from '../lib/workouts';
import { fmtDate, toDateStr } from '../lib/dates';
import { CalendarPicker, DateButton } from './CalendarPicker';
import { BodyMap } from './BodyMap';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];
const weekday = (iso: string) => new Date(iso + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short' });

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)} min`);
const unitOf = (ex: Exercise) => (ex.mode === 'time' ? 'min' : 'reps');
const BLANK_ROW = { reps: '', weight: '' };
const BLANK_DRAFT = { name: '', mode: 'time' as Exercise['mode'], muscles: [] as MuscleId[], intensity: '' };

/**
 * Workout log for one date plus the weekly / monthly / all-time report.
 * The date and the "log form open" state live in the Calendar tab so tapping a day as Gym can open it.
 */
export function WorkoutSection({ view, date, onDateChange, open, onOpenChange }: {
  /** 'log' = enter and edit the day's workouts; 'calendar' = the report shown under the calendar */
  view: 'calendar' | 'log';
  date: string; onDateChange: (d: string) => void; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const { isAdmin, save } = useAuth();
  const [rawLogs, setLogs] = useLocalStorage<WorkoutEntry[]>('workoutLogs', []);
  const [custom, setCustom] = useLocalStorage<Exercise[]>('customExercises', []);
  const [reports] = useLocalStorage<ReportRecord[]>('progressData', []);
  const [profile] = useLocalStorage<Pick<UserProfile, 'gender'>>('userProfile', {});
  const [gymDates, setGymDates] = useLocalStorage<string[]>('gymDates', []);
  const [leaveDates] = useLocalStorage<string[]>('leaveDates', []);
  const [restDates] = useLocalStorage<string[]>('restDates', []);

  const { list: exercises, alias } = useMemo(() => mergeExercises(custom), [custom]);
  // Older entries of a custom workout that now matches a preset are counted under the preset
  const logs = useMemo(() => rawLogs.map(l => alias.has(l.exerciseId) ? { ...l, exerciseId: alias.get(l.exerciseId)! } : l), [rawLogs, alias]);
  const weight = latestWeight(reports);

  const [pickedId, setPickedId] = useState<string | null>(QUICK_IDS[0]);
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  // Counted workouts: sets of reps at a weight, the same for every set or set by set
  const [setCount, setSetCount] = useState('3');
  const [sameWeight, setSameWeight] = useState(true);
  const [shared, setShared] = useState(BLANK_ROW);
  const [rows, setRows] = useState<{ reps: string; weight: string }[]>([]);
  const [period, setPeriod] = useState<Period>('week');
  // Custom from-to range for the report (starts as the last 7 days)
  const [customRange, setCustomRange] = useState<[string, string]>(() => { const t = new Date(); return [toDateStr(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 6)), toDateStr(t)]; });
  const [picker, setPicker] = useState<'day' | 'range' | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(BLANK_DRAFT);

  const nSets = Math.min(20, Math.max(1, Math.floor(Number(setCount)) || 1));
  const rowAt = (i: number) => rows[i] ?? BLANK_ROW;
  const patchRow = (i: number, patch: Partial<typeof BLANK_ROW>) =>
    setRows(r => Array.from({ length: Math.max(r.length, i + 1) }, (_, k) => (k === i ? { ...(r[k] ?? BLANK_ROW), ...patch } : r[k] ?? BLANK_ROW)));

  const status = gymDates.includes(date) ? 'gym' : leaveDates.includes(date) ? 'leave' : restDates.includes(date) ? 'rest' : null;
  const blockedDay = status === 'rest' || status === 'leave';
  const blocked = useMemo(() => new Set([...leaveDates, ...restDates]), [leaveDates, restDates]);

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
  // Workouts on a day later marked Rest or Leave are kept but not counted in the report
  const counted = useMemo(() => logs.filter(l => !blocked.has(l.date)), [logs, blocked]);
  const range = period === 'custom' ? customRange : periodRange(period);
  const shownRange: [string, string] | null = range ?? (counted.length ? [counted.reduce((m, l) => (l.date < m ? l.date : m), counted[0].date), toDateStr(new Date())] : null);
  const summary = useMemo(() => summarize(counted, exercises, range, weight), [counted, exercises, range?.[0], range?.[1], weight]);
  const dayKcal = dayEntries.reduce((s, e) => {
    const ex = exercises.find(x => x.id === e.exerciseId);
    return s + (ex ? caloriesFor(ex, e.amount, weight) : 0);
  }, 0);

  const resetForm = () => {
    setEditingId(null); setQuery(''); setAmount(''); setAdding(false); setDraft(BLANK_DRAFT);
    setSetCount('3'); setSameWeight(true); setShared(BLANK_ROW); setRows([]);
  };
  const closeForm = () => { resetForm(); onOpenChange(false); };

  const startEdit = (en: WorkoutEntry) => {
    setEditingId(en.id); setPickedId(en.exerciseId); setQuery(''); setAdding(false);
    const ex = exercises.find(x => x.id === en.exerciseId);
    if (ex?.mode === 'time') setAmount(String(en.amount));
    else {
      const sets = en.sets?.length ? en.sets : [{ reps: en.amount, weight: 0 }];
      const same = sets.every(s => s.reps === sets[0].reps && s.weight === sets[0].weight);
      const text = (s: WorkoutSet) => ({ reps: String(s.reps), weight: s.weight > 0 ? String(s.weight) : '' });
      setSetCount(String(sets.length)); setSameWeight(same);
      setShared(text(sets[0])); setRows(sets.map(text));
    }
    onOpenChange(true);
  };

  const submitEntry = (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !picked || blockedDay) return;
    const id = editingId ?? `${Date.now()}`;
    let entry: WorkoutEntry;
    if (picked.mode === 'time') {
      const n = Number(amount);
      if (!(n > 0)) return;
      entry = { id, date, exerciseId: picked.id, amount: n };
    } else {
      const sets: WorkoutSet[] = Array.from({ length: nSets }, (_, i) => {
        const r = sameWeight ? shared : rowAt(i);
        return { reps: Math.floor(Number(r.reps)), weight: Math.max(0, Number(r.weight) || 0) };
      });
      if (sets.some(x => !(x.reps > 0))) return;
      entry = { id, date, exerciseId: picked.id, amount: sets.reduce((t, x) => t + x.reps, 0), sets };
    }
    const next = editingId ? rawLogs.map(l => (l.id === editingId ? entry : l)) : [...rawLogs, entry];
    setLogs(next);
    // A logged workout on an unmarked day makes it a gym day
    if (!gymDates.includes(date)) {
      const gym = [...gymDates, date];
      setGymDates(gym);
      save({ workoutLogs: next, gymDates: gym });
    } else save({ workoutLogs: next });
    if (editingId) closeForm(); else { setAmount(''); setShared(sh => ({ ...sh, reps: '' })); setRows([]); }
  };

  const removeEntry = (id: string) => {
    const next = rawLogs.filter(l => l.id !== id);
    setLogs(next); save({ workoutLogs: next });
    if (editingId === id) closeForm();
  };

  const addExercise = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!isAdmin || !name) return;
    // Same name as an existing workout: use that one instead of creating a duplicate
    const existing = exercises.find(x => normName(x.name) === normName(name));
    if (existing) { pick(existing); setDraft(BLANK_DRAFT); return; }
    const intensity = Number(draft.intensity);
    const ex: Exercise = {
      id: `c${Date.now()}`, name, mode: draft.mode, muscles: draft.muscles,
      ...(draft.mode === 'time' ? { met: intensity > 0 ? intensity : 5 } : { kcalPerRep: intensity > 0 ? intensity : 0.4 }),
    };
    const next = [...custom, ex];
    setCustom(next); save({ customExercises: next });
    pick(ex);
    setDraft(BLANK_DRAFT);
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

  const form = (
    <div className="log-form">
      <label className="field-label" htmlFor="workout-search">Workout</label>
      <input id="workout-search" className="input-field" autoComplete="off" autoCapitalize="words" maxLength={40}
        placeholder="Type to search, e.g. chest" value={query}
        onChange={e => { setQuery(e.target.value); setAdding(false); }}
        onKeyDown={e => {
          if (e.key !== 'Enter' || !query.trim()) return;
          e.preventDefault();
          if (exactMatch) pick(exactMatch);
          else if (matches[0]) pick(matches[0]);
          else { setDraft(d => ({ ...d, name: query.trim() })); setAdding(true); }
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
          {!exactMatch && (
            <li>
              <button type="button" className="suggest-new" onClick={() => { setDraft(d => ({ ...d, name: query.trim() })); setAdding(true); }}>
                <Plus size={14} /> <span className="suggest-name">Add &ldquo;{query.trim()}&rdquo; as new workout</span>
              </button>
            </li>
          )}
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

      {adding && (
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
          {custom.some(c => !alias.has(c.id)) && (
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

      {picked?.mode === 'reps' ? (
        <form className="sets-form" onSubmit={submitEntry}>
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
          <div className="form-actions">
            <button type="submit" className="submit-btn">{editingId ? 'Save changes' : 'Add'}</button>
            <button type="button" className="tab-btn cancel-btn" onClick={closeForm}>{editingId ? 'Cancel' : 'Done'}</button>
          </div>
        </form>
      ) : (
        <form className="sets-form" onSubmit={submitEntry}>
          <input className="input-field" type="number" min="1" step="1" inputMode="numeric" required
            placeholder={picked ? 'Minutes' : 'Pick a workout first'} disabled={!picked} value={amount} onChange={e => setAmount(e.target.value)} />
          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={!picked}>{editingId ? 'Save changes' : 'Add'}</button>
            <button type="button" className="tab-btn cancel-btn" onClick={closeForm}>{editingId ? 'Cancel' : 'Done'}</button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <>
      {view === 'log' && <div className="glass-panel mb-6" id="workout-log">
        <div className="log-head">
          <div>
            <div className="chart-card-title">Workout log</div>
            <p className="chart-card-hint">Pick a day to see, add, edit or delete its workouts.</p>
          </div>
          <DateButton label="Choose the workout date" onClick={() => setPicker('day')}>{weekday(date)} {fmtDate(date)}</DateButton>
        </div>

        {blockedDay && (
          <p className="day-note blocked"><Ban size={15} /> This day is marked {status === 'rest' ? 'Rest' : 'Leave'}, so workouts can&rsquo;t be added. Change the mark on the calendar first.</p>
        )}

        {dayEntries.length > 0 ? (
          <ul className="entry-list">
            {dayEntries.map(en => {
              const ex = exercises.find(x => x.id === en.exerciseId);
              if (!ex) return null;
              return (
                <li key={en.id} className={editingId === en.id ? 'editing' : ''}>
                  <span className="entry-name">{ex.name}{en.sets?.length ? <small className="entry-sub">{describeSets(en.sets)}</small> : null}</span>
                  {!en.sets?.length && <span className="entry-amt">{en.amount} {unitOf(ex)}</span>}
                  <span className="entry-kcal">{Math.round(caloriesFor(ex, en.amount, weight))} kcal</span>
                  {isAdmin && (
                    <>
                      {!blockedDay && <button type="button" className="icon-btn" aria-label={`Edit ${ex.name}`} onClick={() => startEdit(en)}><Pencil size={15} /></button>}
                      <button type="button" className="icon-btn" aria-label={`Delete ${ex.name}`} onClick={() => removeEntry(en.id)}><Trash2 size={15} /></button>
                    </>
                  )}
                </li>
              );
            })}
            <li className="entry-total"><span>Day total{blockedDay ? ' (not counted)' : ''}</span><span>{Math.round(dayKcal)} kcal</span></li>
          </ul>
        ) : !blockedDay && (
          <p className="day-note">{status === 'gym' ? 'Gym day: nothing logged yet.' : 'No workouts logged for this day.'}</p>
        )}

        {isAdmin && !blockedDay && (open ? form : (
          <button type="button" className="submit-btn log-btn" onClick={() => { resetForm(); onOpenChange(true); }}>
            <Plus size={16} /> Log workout
          </button>
        ))}
        {!isAdmin && <p className="calendar-hint">🔒 View only — log in as admin to add workouts</p>}
      </div>}

      {view === 'calendar' && <div className="glass-panel mb-6">
        <div className="seg period-seg" role="tablist" aria-label="Report period">
          {PERIODS.map(p => (
            <button key={p.id} type="button" role="tab" aria-selected={period === p.id}
              className={`chip ${period === p.id ? 'on' : ''}`}
              onClick={() => { setPeriod(p.id); if (p.id === 'custom') setPicker('range'); }}>{p.label}</button>
          ))}
        </div>
        <div className="range-row">
          <DateButton label="Choose the report date range" onClick={() => setPicker('range')}>
            {shownRange ? `${fmtDate(shownRange[0])} → ${fmtDate(shownRange[1])}` : 'No workouts yet'}
          </DateButton>
        </div>

        <div className="streak-grid">
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
            <p className="chart-card-hint">Hover or tap a muscle. Hotter colour = worked more often.</p>
            <BodyMap muscles={summary.byMuscle} max={summary.maxHits} gender={profile.gender ?? 'male'} />
            <ul className="muscle-list">
              {[...summary.byMuscle].sort((a, b) => b.hits - a.hits).map(m => (
                <li key={m.id}>
                  <span className="muscle-name"><span aria-hidden="true">{m.emoji}</span> {m.label}</span>
                  <span className="muscle-bar"><i style={{ width: `${summary.maxHits ? (m.hits / summary.maxHits) * 100 : 0}%` }} /></span>
                  <span className="muscle-n">{m.hits}×</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>}

      {picker === 'day' && (
        <CalendarPicker mode="single" title="Workout date" value={date} onPick={onDateChange} onClose={() => setPicker(null)} />
      )}
      {picker === 'range' && (
        <CalendarPicker mode="range" title="Report range" from={shownRange?.[0] ?? customRange[0]} to={shownRange?.[1] ?? customRange[1]}
          onApply={(f, t) => { setCustomRange([f, t]); setPeriod('custom'); }} onClose={() => setPicker(null)} />
      )}
    </>
  );
}
