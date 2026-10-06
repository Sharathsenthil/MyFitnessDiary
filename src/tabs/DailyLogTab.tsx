import { useState, type ReactNode } from 'react';
import { Dumbbell, X, Moon } from 'lucide-react';
import type { DayStatus, UserProfile } from '../types';
import { useLocalStorage } from '../lib/storage';
import { parseDateStr, toDateStr } from '../lib/dates';
import { useAuth } from '../lib/auth';
import { computeStreaks } from '../lib/streaks';
import { StreakPanel } from '../components/StreakPanel';

export function DailyLogTab() {
  const { isAdmin, save } = useAuth();
  const [gymDates, setGymDates] = useLocalStorage<string[]>('gymDates', []);
  const [leaveDates, setLeaveDates] = useLocalStorage<string[]>('leaveDates', []);
  const [restDates, setRestDates] = useLocalStorage<string[]>('restDates', []);
  const [userProfile] = useLocalStorage<Pick<UserProfile, 'gymJoinedDate'>>('userProfile', { gymJoinedDate: '2026-01-01' });
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = currentMonth.getDay();
  const yearStr = currentMonth.getFullYear();
  const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
  const daysAttended = gymDates.filter(d => d.startsWith(`${yearStr}-${monthStr}`)).length;

  const joinedDate = parseDateStr(userProfile.gymJoinedDate || '2026-01-01');
  const inMonth = (list: string[]) => list.filter(d => d.startsWith(`${yearStr}-${monthStr}`)).length;
  const daysLeave = inMonth(leaveDates);
  const daysRest = inMonth(restDates);

  const sinceJoined = (list: string[]) => list.filter(d => parseDateStr(d) >= joinedDate && parseDateStr(d) <= today);
  const restSinceJoined = sinceJoined(restDates).length;
  // Rest days are planned, so they don't count against your attendance
  const totalDaysSinceJoined = Math.max(1, Math.floor((today.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 - restSinceJoined);
  const totalDaysAttended = gymDates.filter(d => parseDateStr(d) >= joinedDate).length;
  const overallPct = Math.min(100, Math.round((totalDaysAttended / totalDaysSinceJoined) * 100));

  const statusOf = (dayStr: string): DayStatus | null =>
    gymDates.includes(dayStr) ? 'gym' : leaveDates.includes(dayStr) ? 'leave' : restDates.includes(dayStr) ? 'rest' : null;

  // Each tap moves to the next mark: none -> gym -> leave -> rest -> none
  const NEXT: Record<string, DayStatus | null> = { none: 'gym', gym: 'leave', leave: 'rest', rest: null };
  const cycleDate = (dayStr: string) => {
    if (!isAdmin) return;
    const next = NEXT[statusOf(dayStr) ?? 'none'];
    const without = (list: string[]) => list.filter(d => d !== dayStr);
    const gym = next === 'gym' ? [...without(gymDates), dayStr] : without(gymDates);
    const leave = next === 'leave' ? [...without(leaveDates), dayStr] : without(leaveDates);
    const rest = next === 'rest' ? [...without(restDates), dayStr] : without(restDates);
    setGymDates(gym); setLeaveDates(leave); setRestDates(rest);
    save({ gymDates: gym, leaveDates: leave, restDates: rest });
  };

  const days: ReactNode[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`e-${i}`} className="calendar-day empty" />);
  
  const joinD = parseDateStr(userProfile.gymJoinedDate || '2026-01-01');
  joinD.setHours(0,0,0,0);
  const todayOnly = new Date();
  todayOnly.setHours(0,0,0,0);

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
    const dayStr = toDateStr(d);
    const status = statusOf(dayStr);
    const isToday = dayStr === toDateStr(today);
    const outOfRange = d < joinD || d > todayOnly;
    const isInvalid = !isAdmin || outOfRange;
    const faded = outOfRange || (!isAdmin && !status);

    days.push(
      <div
        key={i}
        role="button"
        tabIndex={isInvalid ? -1 : 0}
        aria-label={`${dayStr}${status ? ` - ${status}` : ''}`}
        onKeyDown={e => { if (!isInvalid && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); cycleDate(dayStr); } }}
        className={`calendar-day ${status ? `${status}-day` : ''} ${isToday ? 'today' : ''} ${faded ? 'disabled' : ''}`}
        onClick={() => !isInvalid && cycleDate(dayStr)}
      >
        <span className="day-number">{i}</span>
        {status === 'gym' && <Dumbbell size={16} />}
        {status === 'leave' && <X size={16} />}
        {status === 'rest' && <Moon size={16} />}
      </div>
    );
  }

  const pct = Math.round((daysAttended / daysInMonth) * 100);
  const streaks = computeStreaks(gymDates, restDates);

  return (
    <div className="tab-content fade-in">
      <StreakPanel stats={streaks} />
      <div className="glass-panel mb-6">
        {/* Month nav */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="tab-btn month-btn" aria-label="Previous month">‹</button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="tab-btn month-btn" aria-label="Next month">›</button>
        </div>

        {/* Attendance summary */}
        <div className="attendance-banner" style={{ flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>This Month</div>
            <div>
              <span className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 700 }}>{daysAttended}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}> / {daysInMonth} days</span>
            </div>
            <div className="progress-container" style={{ height: 6, marginTop: 4 }}>
              <div className="progress-bar" style={{ width: `${pct}%`, background: pct >= 50 ? 'var(--success)' : 'var(--warning)' }} />
            </div>
          </div>
          
          <div className="attendance-alltime" style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>All Time (Since {userProfile.gymJoinedDate})</div>
            <div>
              <span className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 700 }}>{totalDaysAttended}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}> / {totalDaysSinceJoined} days</span>
            </div>
            <div className="progress-container" style={{ height: 6, marginTop: 4 }}>
              <div className="progress-bar" style={{ width: `${overallPct}%`, background: overallPct >= 50 ? 'var(--success)' : 'var(--warning)' }} />
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="calendar-header-day">{d}</div>
          ))}
          {days}
        </div>
        <div className="calendar-legend">
          <span><i className="dot gym" /> Gym {daysAttended}</span>
          <span><i className="dot leave" /> Leave {daysLeave}</span>
          <span><i className="dot rest" /> Rest {daysRest}</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>
          {isAdmin
            ? 'Tap a day: once = gym 🏋️ · twice = leave ❌ · three times = rest 🌙 · four times = clear'
            : '🔒 View only — log in as admin to edit'}
        </p>
      </div>
    </div>
  );
}

