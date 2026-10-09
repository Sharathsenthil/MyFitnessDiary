import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  FileText, LayoutDashboard, CalendarCheck, TrendingUp,
  Menu, Moon, Sun, Lock, Unlock, X, KeyRound,
} from 'lucide-react';
import type { Exercise, FitnessResponse, TabId, WorkoutEntry } from './types';
import { useLocalStorage } from './lib/storage';
import { AuthContext, TOKEN_KEY } from './lib/auth';
import { cleanRecords, sortRecords } from './lib/records';
import { scrollToTop } from './lib/scroll';
import { ReportTab } from './tabs/ReportTab';
import { DailyLogTab } from './tabs/DailyLogTab';
import { NewReportTab } from './tabs/NewReportTab';
import { ProgressTab } from './tabs/ProgressTab';
import './index.css';

const NAV_ITEMS: { id: TabId; label: string; Icon: typeof FileText }[] = [
  { id: 'report', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'daily', label: 'Calendar', Icon: CalendarCheck },
  { id: 'new-report', label: 'New Report', Icon: FileText },
  { id: 'progress', label: 'Progress', Icon: TrendingUp },
];

const TAB_TITLES: Record<TabId, [string, string]> = {
  report: ['Health Overview', 'Take control of your health today!'],
  daily: ['Gym Calendar', 'Track your daily gym attendance'],
  'new-report': ['New Report', 'Log your latest body composition metrics'],
  progress: ['Progress', 'Trends across your reports, plus side-by-side comparison'],
};

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('report');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useLocalStorage('darkMode', false);
  const [token, setToken] = useState<string>(() => {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  });
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const isAdmin = !!token;
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [, setUserProfile] = useLocalStorage<object>('userProfile', {});
  const [, setProgressData] = useLocalStorage<unknown[]>('progressData', []);
  const [, setGymDates] = useLocalStorage<string[]>('gymDates', []);
  const [, setLeaveDates] = useLocalStorage<string[]>('leaveDates', []);
  const [, setRestDates] = useLocalStorage<string[]>('restDates', []);
  const [, setWorkoutLogs] = useLocalStorage<WorkoutEntry[]>('workoutLogs', []);
  const [, setCustomExercises] = useLocalStorage<Exercise[]>('customExercises', []);

  // Theme variables live on <html> too, so the area behind the status bar matches the theme
  useEffect(() => { document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);

  const logout = useCallback(() => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
    setToken('');
  }, []);

  // Persist to the backend; the server rejects it unless the admin token is valid.
  const save = useCallback(async (body: object) => {
    try {
      const res = await fetch('/api/fitness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.status === 401) { logout(); alert('Admin session expired. Please log in again.'); }
    } catch (err) {
      console.error('Failed to save to backend:', err);
    }
  }, [token, logout]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setLoginError(data.error || 'Login failed'); return; }
      try { localStorage.setItem(TOKEN_KEY, data.token); } catch { /* noop */ }
      setToken(data.token);
      setShowLogin(false);
      setPassword('');
    } catch {
      setLoginError('Cannot reach the server');
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) return setPwMsg({ ok: false, text: 'New passwords do not match' });
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setPwMsg({ ok: false, text: data.error || 'Could not change password' });
      try { localStorage.setItem(TOKEN_KEY, data.token); } catch { /* noop */ }
      setToken(data.token);
      setPwForm({ current: '', next: '', confirm: '' });
      setPwMsg({ ok: true, text: 'Password updated ✓' });
      setTimeout(() => { setShowChangePw(false); setPwMsg(null); }, 1200);
    } catch {
      setPwMsg({ ok: false, text: 'Cannot reach the server' });
    }
  };

  useEffect(() => {
    fetch('/api/fitness')
      .then(res => res.ok ? res.json() as Promise<FitnessResponse> : null)
      .then(data => {
        if (!data) return;
        if (data.personalInfo) setUserProfile(data.personalInfo);
        const reports = sortRecords(cleanRecords(data.progressData));
        if (reports.length > 0) setProgressData(reports);
        if (Array.isArray(data.gymDates) && data.gymDates.length > 0) setGymDates(data.gymDates);
        if (Array.isArray(data.leaveDates) && data.leaveDates.length > 0) setLeaveDates(data.leaveDates);
        if (Array.isArray(data.restDates) && data.restDates.length > 0) setRestDates(data.restDates);
        if (Array.isArray(data.workoutLogs) && data.workoutLogs.length > 0) setWorkoutLogs(data.workoutLogs);
        if (Array.isArray(data.customExercises) && data.customExercises.length > 0) setCustomExercises(data.customExercises);
      })
      .catch(err => console.error('Error fetching data:', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drop a stale/expired token on load
  useEffect(() => {
    if (!token) return;
    fetch('/api/verify', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.status === 401) logout(); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // View-only users can't see the editor tab
  const navItems = NAV_ITEMS.filter(n => isAdmin || n.id !== 'new-report');
  const currentTab: TabId = !isAdmin && activeTab === 'new-report' ? 'report' : activeTab;

  // Every tab starts at the top (the scroll position otherwise carries over from the previous tab)
  useEffect(() => { scrollToTop(false); }, [currentTab]);

  return (
    <AuthContext.Provider value={{ isAdmin, save }}>
    <div className={`app-window ${isDarkMode ? 'dark' : ''}`}>
      <div className={`sidebar ${isSidebarOpen ? '' : 'closed'}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">⚡</div>
          {isSidebarOpen && <h1 className="brand-name">Fitness Diary</h1>}
          <button className="sidebar-toggle" aria-label="Toggle sidebar" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={22} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ id, label, Icon }) => (
            <button key={id} className={`nav-item ${currentTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)} aria-label={label} title={label}>
              <Icon size={20} style={{ flexShrink: 0 }} /> <span className="nav-label">{isSidebarOpen && label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="main-content">
        <div className="page-container">
          <header className="page-header">
            <div>
              <h1 className="page-title">{TAB_TITLES[currentTab][0]}</h1>
              <p className="page-subtitle">{TAB_TITLES[currentTab][1]}</p>
            </div>
            <div className="header-actions">
            {isAdmin && (
              <button className="admin-btn" onClick={() => setShowChangePw(true)} title="Change admin password">
                <KeyRound size={16} /><span>Password</span>
              </button>
            )}
            <button className={`admin-btn ${isAdmin ? 'on' : ''}`} onClick={() => isAdmin ? logout() : setShowLogin(true)} title={isAdmin ? 'Log out of admin' : 'Admin login'}>
              {isAdmin ? <Unlock size={16} /> : <Lock size={16} />}
              <span>{isAdmin ? 'Admin · Log out' : 'View only'}</span>
            </button>
            <button className="theme-toggle" aria-label="Toggle dark mode" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            </div>
          </header>

        <div className="tab-wrapper">
          {currentTab === 'report' && <ReportTab />}
          {currentTab === 'daily' && <DailyLogTab />}
          {currentTab === 'new-report' && <NewReportTab />}
          {currentTab === 'progress' && <ProgressTab />}
        </div>
        </div>
      </div>

      {showChangePw && (
        <div className="modal-backdrop" onClick={() => setShowChangePw(false)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleChangePassword}>
            <div className="panel-header">
              <div className="panel-title"><KeyRound size={18} /> Change Password</div>
              <button type="button" className="sidebar-toggle" style={{ color: 'var(--text-main)' }} aria-label="Close" onClick={() => setShowChangePw(false)}><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <input type="password" className="input-field" placeholder="Current password" autoComplete="current-password" required
                value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
              <input type="password" className="input-field" placeholder="New password (min 6 characters)" autoComplete="new-password" minLength={6} required
                value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
              <input type="password" className="input-field" placeholder="Confirm new password" autoComplete="new-password" required
                value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
            {pwMsg && <p className={pwMsg.ok ? 'login-ok' : 'login-error'}>{pwMsg.text}</p>}
            <button type="submit" className="submit-btn" style={{ marginTop: '1rem' }}>Update password</button>
          </form>
        </div>
      )}

      {showLogin && (
        <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleLogin}>
            <div className="panel-header">
              <div className="panel-title"><Lock size={18} /> Admin Login</div>
              <button type="button" className="sidebar-toggle" style={{ color: 'var(--text-main)' }} aria-label="Close" onClick={() => setShowLogin(false)}><X size={20} /></button>
            </div>
            <label className="field-label" htmlFor="admin-pw">Enter the admin password to edit data.</label>
            <input id="admin-pw" type="password" className="input-field" autoFocus value={password}
              onChange={e => setPassword(e.target.value)} placeholder="Password" required />
            {loginError && <p className="login-error">{loginError}</p>}
            <button type="submit" className="submit-btn" style={{ marginTop: '1rem' }}>Unlock editing</button>
          </form>
        </div>
      )}
    </div>
    </AuthContext.Provider>
  );
}

export default App;
