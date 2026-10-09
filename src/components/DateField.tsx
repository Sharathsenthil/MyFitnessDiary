import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { toDateStr } from '../lib/dates';

type Parts = { d: string; m: string; y: string };
const EMPTY: Parts = { d: '', m: '', y: '' };

/** The year is typed with two digits: up to this year's last two digits means 20xx, above it 19xx. */
const fullYear = (yy: number) => (yy <= new Date().getFullYear() % 100 ? 2000 + yy : 1900 + yy);

const isoToParts = (iso: string): Parts => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? { d, m, y: y.slice(2) } : EMPTY;
};

/** Three 2-digit parts -> ISO date, or null when it isn't a real date. */
function partsToIso({ d, m, y }: Parts): string | null {
  if (d.length !== 2 || m.length !== 2 || y.length !== 2) return null;
  const day = Number(d), month = Number(m), year = fullYear(Number(y));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toDateStr(date);
}

const SEGMENTS = [
  { key: 'd', label: 'Day', placeholder: 'DD' },
  { key: 'm', label: 'Month', placeholder: 'MM' },
  { key: 'y', label: 'Year', placeholder: 'YY' },
] as const;

/**
 * Type the date as DD / MM / YY. Each part is its own box, so tap any one to change just that part;
 * typing two digits moves on to the next box. `value` and `onChange` use ISO dates (YYYY-MM-DD).
 */
export function DateField({ value, onChange, allowFuture = false, compact = false, label = 'Date, day month year' }: {
  value: string; onChange: (iso: string) => void; allowFuture?: boolean;
  /** Just the box: no Today button or weekday line */
  compact?: boolean; label?: string;
}) {
  const [parts, setParts] = useState<Parts>(isoToParts(value));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Follow outside changes (Edit on a history row, import, form reset) without fighting the user's typing.
  useEffect(() => {
    if (partsToIso(parts) !== value) setParts(isoToParts(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const iso = partsToIso(parts);
  const complete = parts.d.length === 2 && parts.m.length === 2 && parts.y.length === 2;
  const inFuture = !!iso && !allowFuture && iso > toDateStr(new Date());
  const problem = !parts.d && !parts.m && !parts.y ? 'Enter the date'
    : !complete ? 'Enter the full date: DD / MM / YY'
    : !iso ? 'That date does not exist'
    : inFuture ? 'The date cannot be in the future' : '';

  // Block form submission until the date is complete and valid
  useEffect(() => { refs.current[0]?.setCustomValidity(problem); }, [problem]);

  const update = (next: Parts) => {
    setParts(next);
    const parsed = partsToIso(next);
    if (parsed && (allowFuture || parsed <= toDateStr(new Date()))) onChange(parsed);
  };

  const handle = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const key = SEGMENTS[i].key;
    let v = e.target.value.replace(/\D/g, '').slice(0, 2);
    // A first digit that can't start a day/month (4-9 / 2-9) is taken as "0" + digit
    if (v.length === 1 && ((key === 'd' && Number(v) > 3) || (key === 'm' && Number(v) > 1))) v = `0${v}`;
    update({ ...parts, [key]: v });
    if (v.length === 2 && i < 2) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    const key = SEGMENTS[i].key;
    if (e.key === 'Backspace' && !parts[key] && i > 0) { e.preventDefault(); refs.current[i - 1]?.focus(); }
    if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0 && i > 0) { e.preventDefault(); refs.current[i - 1]?.focus(); }
    if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length && i < 2) { e.preventDefault(); refs.current[i + 1]?.focus(); }
  };

  const weekday = iso && !inFuture
    ? new Date(iso + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: '2-digit' })
    : '';

  return (
    <div>
      <div className="date-field">
        <div className="date-box" role="group" aria-label={label}>
          {SEGMENTS.map((s, i) => (
            <span key={s.key} className="date-seg">
              {i > 0 && <span className="date-sep">/</span>}
              <input
                ref={el => { refs.current[i] = el; }}
                className="date-part"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={2}
                placeholder={s.placeholder}
                aria-label={`${label}: ${s.label.toLowerCase()}`}
                value={parts[s.key]}
                onChange={handle(i)}
                onKeyDown={onKeyDown(i)}
                onFocus={e => e.currentTarget.select()}
              />
            </span>
          ))}
        </div>
        {!compact && (
          <button type="button" className="tab-btn date-today"
            onClick={() => { const t = toDateStr(new Date()); setParts(isoToParts(t)); onChange(t); }}>
            Today
          </button>
        )}
      </div>
      {!compact && weekday && <p className="section-note" style={{ margin: '0.2rem 0 0' }}>{weekday}</p>}
      {complete && problem && <p className="login-error">{problem}</p>}
    </div>
  );
}
