import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, fmtDate, parseDateStr, toDateStr } from '../lib/dates';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** A compact button that shows the chosen date or range and opens a calendar. */
export function DateButton({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button type="button" className="date-btn" onClick={onClick} aria-label={label} aria-haspopup="dialog">
      <CalendarDays size={16} aria-hidden="true" /> <span>{children}</span>
    </button>
  );
}

type Common = { max?: string; title: string; onClose: () => void };
type Props =
  | (Common & { mode: 'single'; value: string; onPick: (iso: string) => void })
  | (Common & { mode: 'range'; from: string; to: string; onApply: (from: string, to: string) => void });

/**
 * Month calendar in a pop-up. Single mode: tap a day to choose it. Range mode: tap the first day, then the
 * last (tapping an earlier day swaps them), then Apply. Days after `max` (default today) can't be chosen.
 */
export function CalendarPicker(props: Props) {
  const today = toDateStr(new Date());
  const max = props.max ?? today;
  const start = props.mode === 'single' ? props.value : props.to || props.from;
  const [cursor, setCursor] = useState(() => { const d = parseDateStr(start || today); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [a, setA] = useState<string | null>(props.mode === 'range' ? props.from : null);
  const [b, setB] = useState<string | null>(props.mode === 'range' ? props.to : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') props.onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props]);

  const first = cursor.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const atMaxMonth = toDateStr(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) > max;
  const monthLabel = `${cursor.toLocaleString('en-GB', { month: 'long' })} '${String(cursor.getFullYear()).slice(2)}`;
  const move = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  const choose = (iso: string) => {
    if (props.mode === 'single') { props.onPick(iso); props.onClose(); return; }
    if (a && !b) {
      if (iso < a) { setB(a); setA(iso); } else setB(iso);
    } else { setA(iso); setB(null); }
  };
  const preset = (days: number) => { props.mode === 'range' && props.onApply(toDateStr(addDays(new Date(), -(days - 1))), today); props.onClose(); };
  const lo = a && b ? a : a, hi = a && b ? b : a;

  const cells: ReactNode[] = [];
  for (let i = 0; i < first; i++) cells.push(<span key={`e${i}`} />);
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toDateStr(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    const disabled = iso > max;
    const isSingle = props.mode === 'single' && iso === props.value;
    const isStart = props.mode === 'range' && iso === lo, isEnd = props.mode === 'range' && iso === hi;
    const inside = props.mode === 'range' && !!lo && !!hi && iso > lo && iso < hi;
    cells.push(
      <button key={iso} type="button" disabled={disabled} aria-label={fmtDate(iso)} aria-pressed={isSingle || isStart || isEnd}
        className={`cal-day ${isSingle || isStart || isEnd ? 'sel' : ''} ${inside ? 'in' : ''} ${isStart && hi !== lo ? 'cap-l' : ''} ${isEnd && hi !== lo ? 'cap-r' : ''} ${iso === today ? 'today' : ''}`}
        onClick={() => choose(iso)}>
        {day}
      </button>,
    );
  }

  return createPortal(
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="modal cal-modal" role="dialog" aria-modal="true" aria-label={props.title} onClick={e => e.stopPropagation()}>
        <div className="cal-title">{props.title}</div>

        {props.mode === 'range' && (
          <div className="cal-presets">
            {[[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days']].map(([n, label]) => (
              <button key={n} type="button" className="chip" onClick={() => preset(n as number)}>{label}</button>
            ))}
          </div>
        )}

        <div className="cal-nav">
          <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={20} /></button>
          <strong>{monthLabel}</strong>
          <button type="button" className="icon-btn" aria-label="Next month" onClick={() => move(1)} disabled={atMaxMonth}><ChevronRight size={20} /></button>
        </div>

        <div className="cal-grid">
          {WEEKDAYS.map(w => <span key={w} className="cal-wd">{w}</span>)}
          {cells}
        </div>

        {props.mode === 'range' ? (
          <>
            <p className="cal-summary">{a ? `${fmtDate(a)} → ${b ? fmtDate(b) : 'pick the last day'}` : 'Pick the first day'}</p>
            <div className="form-actions">
              <button type="button" className="submit-btn" disabled={!a}
                onClick={() => { if (a) { props.onApply(a, b ?? a); props.onClose(); } }}>Apply</button>
              <button type="button" className="tab-btn cancel-btn" onClick={props.onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <div className="form-actions">
            <button type="button" className="tab-btn cancel-btn" onClick={() => { props.onPick(today); props.onClose(); }}>Today</button>
            <button type="button" className="tab-btn cancel-btn" onClick={props.onClose}>Close</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
