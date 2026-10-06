import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';
import { toDateStr } from '../lib/dates';

/** Digits typed so far (max 8: DDMMYYYY) shown in a fill-in mask: "06 / 1_ / ____". */
const toMask = (digits: string) => {
  const c = (i: number) => digits[i] ?? '_';
  return `${c(0)}${c(1)} / ${c(2)}${c(3)} / ${c(4)}${c(5)}${c(6)}${c(7)}`;
};

/** Caret position just after the last typed digit within the mask. */
const caretFor = (n: number) => (n <= 2 ? n : n <= 4 ? n + 3 : n + 6);

const isoToDigits = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}${m}${y}` : '';
};

/** 8 digits (DDMMYYYY) -> ISO date, or null when it isn't a real date. */
function digitsToIso(digits: string): string | null {
  if (digits.length !== 8) return null;
  const d = Number(digits.slice(0, 2)), mo = Number(digits.slice(2, 4)), y = Number(digits.slice(4));
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d || y < 2000) return null;
  return toDateStr(date);
}

/**
 * Type the date straight in. The box always shows the pattern "__ / __ / ____" and fills in as you
 * type digits (no separators needed). `value` and `onChange` use ISO dates (YYYY-MM-DD).
 */
export function DateField({ value, onChange, allowFuture = false }: {
  value: string; onChange: (iso: string) => void; allowFuture?: boolean;
}) {
  const [digits, setDigits] = useState(isoToDigits(value));
  const ref = useRef<HTMLInputElement>(null);

  // Follow outside changes (Edit on a history row, import, form reset) without fighting the user's typing.
  useEffect(() => {
    if (digitsToIso(digits) !== value) setDigits(isoToDigits(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Keep the caret right after the last digit so typing always continues in the next blank
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement === el) el.setSelectionRange(caretFor(digits.length), caretFor(digits.length));
  }, [digits]);

  const iso = digitsToIso(digits);
  const inFuture = !!iso && !allowFuture && iso > toDateStr(new Date());
  const problem = digits.length === 0 ? 'Enter the report date'
    : !iso ? (digits.length === 8 ? 'That date does not exist' : 'Enter the full date: DD / MM / YYYY')
    : inFuture ? 'The date cannot be in the future' : '';

  // Block form submission until the date is complete and valid
  useEffect(() => { ref.current?.setCustomValidity(problem); }, [problem]);

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/\D/g, '').slice(0, 8);
    setDigits(next);
    const parsed = digitsToIso(next);
    if (parsed && (allowFuture || parsed <= toDateStr(new Date()))) onChange(parsed);
  };

  const placeCaret = () => {
    const el = ref.current;
    if (el) setTimeout(() => el.setSelectionRange(caretFor(digits.length), caretFor(digits.length)), 0);
  };

  const weekday = iso && !inFuture
    ? new Date(iso + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div>
      <div className="date-field">
        <input
          ref={ref}
          className={`input-field date-mask ${digits.length === 0 ? 'is-empty' : ''}`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={toMask(digits)}
          onChange={handle}
          onFocus={placeCaret}
          onClick={placeCaret}
          aria-label="Report date, day month year"
        />
        <button type="button" className="tab-btn date-today"
          onClick={() => { const t = toDateStr(new Date()); setDigits(isoToDigits(t)); onChange(t); }}>
          Today
        </button>
      </div>
      {weekday && <p className="section-note" style={{ margin: '0.2rem 0 0' }}>{weekday}</p>}
      {digits.length === 8 && problem && <p className="login-error">{problem}</p>}
    </div>
  );
}
