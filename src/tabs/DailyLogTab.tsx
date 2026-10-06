import { useState, type ReactNode } from 'react';
import { Dumbbell } from 'lucide-react';
import type { UserProfile } from '../types';
import { useLocalStorage } from '../lib/storage';
import { parseDateStr, toDateStr } from '../lib/dates';
import { useAuth } from '../lib/auth';
import { computeStreaks } from '../lib/streaks';
import { StreakPanel } from '../components/StreakPanel';

export function DailyLogTab() {
  const { isAdmin, save } = useAuth();
  const [gymDates, setGymDates] = useLocalStorage<string[]>('gymDates', []);
  const [userProfile] = useLocalStorage<Pick<UserProfile, 'gymJoinedDate'>>('userProfile', { gymJoinedDate: '2026-01-01' });
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = currentMonth.getDay();
  const yearStr = currentMonth.getFullYear();
  const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
  const daysAttended = gymDates.filter(d => d.startsWith(`${yearStr}-${monthStr}`)).length;

  const joinedDate = parseDateStr(userProfile.gymJoinedDate || '2026-01-01');
  const totalDaysSinceJoined = Math.max(1, Math.floor((today.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const totalDaysAttended = gymDates.filter(d => parseDateStr(d) >= joinedDate).length;
  const overallPct = Math.round((totalDaysAttended / totalDaysSinceJoined) * 100);

  const toggleDate = (dayStr: string) => {
    if (!isAdmin) return;
    const next = gymDates.includes(dayStr)
      ? gymDates.filter(d => d !== dayStr)
      : [...gymDates, dayStr];
    setGymDates(next);
    save({ gymDates: next });
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
    const isGymDay = gymDates.includes(dayStr);
    const isToday = dayStr === toDateStr(today);
    const isInvalid = !isAdmin || d < joinD || d > todayOnly;

    days.push(
      <div 
        key={i} 
        role="button"
        tabIndex={isInvalid ? -1 : 0}
        onKeyDown={e => { if (!isInvalid && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleDate(dayStr); } }}
        className={`calendar-day ${isGymDay ? 'gym-day' : ''} ${isToday ? 'today' : ''} ${isInvalid && !(isGymDay && !isAdmin) ? 'disabled' : ''}`} 
        onClick={() => !isInvalid && toggleDate(dayStr)}
      >
        <span className="day-number">{i}</span>
        {isGymDay && !isInvalid && <Dumbbell size={16} color="var(--accent-text)" />}
      </div>
    );
  }

  const pct = Math.round((daysAttended / daysInMonth) * 100);
  const streaks = computeStreaks(gymDates);

  return (
    <div className="tab-content fade-in">
      <StreakPanel stats={streaks} />
      <div className="glass-panel mb-6">
        {/* Month nav */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="tab-btn" style={{ padding: '0.4rem 0.9rem' }}>‹</button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="tab-btn" style={{ padding: '0.4rem 0.9rem' }}>›</button>
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
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
          {isAdmin ? 'Click any day to mark it as a gym day 🏋️' : '🔒 View only — log in as admin to edit'}
        </p>
      </div>
    </div>
  );
}

