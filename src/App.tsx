import { useState, useEffect, useCallback, createContext, useContext, type FormEvent } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Activity, Scale, Dumbbell, Flame, Target, User,
  LayoutDashboard, FileText, CalendarCheck, TrendingUp,
  PieChart as PieChartIcon, Droplets, ChevronDown, ChevronUp, Plus,
  Menu, Moon, Sun, GitCompare, Lock, Unlock, X, KeyRound, Download, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { fitnessData } from './data';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend, LineChart, Line,
  XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import './index.css';

/* ─── Hook ─────────────────────────────────────────── */
// All instances sharing a key stay in sync (same tab via custom event, other tabs via "storage").
const SYNC_EVENT = 'local-storage-sync';

function useLocalStorage<T>(key: string, initialValue: T) {
  const read = (): T => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  };
  const [storedValue, setStoredValue] = useState<T>(read);

  useEffect(() => {
    const onSync = (e: Event) => {
      if ((e as CustomEvent).detail?.key === key) setStoredValue(read());
    };
    const onStorage = (e: StorageEvent) => { if (e.key === key) setStoredValue(read()); };
    window.addEventListener(SYNC_EVENT, onSync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener('storage', onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const raw = window.localStorage.getItem(key);
      const current: T = raw ? JSON.parse(raw) : initialValue;
      const v = value instanceof Function ? value(current) : value;
      setStoredValue(v);
      window.localStorage.setItem(key, JSON.stringify(v));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key } }));
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [storedValue, setValue] as const;
}

/* ─── Local-time date helpers (toISOString() is UTC and shifts the day in e.g. IST) ─── */
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseDateStr = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/* ─── Admin auth (view-only unless logged in; server enforces it too) ─── */
const TOKEN_KEY = 'adminToken';
const AuthContext = createContext<{ isAdmin: boolean; save: (body: object) => Promise<void> }>({
  isAdmin: false, save: async () => {}
});
const useAuth = () => useContext(AuthContext);

/* ─── Helpers ───────────────────────────────────────── */
function statusInfo(value: number, min?: number, max?: number, isHighBad = false) {
  if (min === undefined || max === undefined) return { label: '–', color: 'var(--text-muted)', badge: 'badge-neutral' };
  if (value > max) return isHighBad
    ? { label: 'High ⬆', color: 'var(--warning)', badge: 'badge-warning' }
    : { label: 'Above Normal', color: 'var(--success)', badge: 'badge-success' };
  if (value < min) return { label: 'Low ⬇', color: 'var(--warning)', badge: 'badge-warning' };
  return { label: 'Normal ✓', color: 'var(--success)', badge: 'badge-success' };
}


/* ─── Metric Row (used inside grouped tables) ────────── */
function MetricRow({ label, value, unit, min, max, isHighBad = false, tooltip = '' }: {
  label: string; value: number; unit: string;
  min?: number; max?: number; isHighBad?: boolean; tooltip?: string;
}) {
  const { label: statusLabel, color, badge } = statusInfo(value, min, max, isHighBad);
  return (
    <tr className="metric-row">
      <td>
        {tooltip
          ? <span className="tooltip-container">{label}<span className="tooltip-text">{tooltip}</span></span>
          : label}
      </td>
      <td className="metric-value" style={{ color }}>
        {value} <span className="metric-unit">{unit}</span>
      </td>
      {(min !== undefined && max !== undefined) ? (
        <>
          <td className="metric-range">{min} – {max}</td>
          <td><span className={`badge ${badge}`}>{statusLabel}</span></td>
        </>
      ) : (
        <td colSpan={2} />
      )}
    </tr>
  );
}

/* ─── Section with collapsible body ─────────────────── */
function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section-card mb-6">
      <button className="section-header" onClick={() => setOpen(o => !o)}>
        <span className="section-title">{icon} {title}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

/* ─── HELPER COMPONENTS ─────────────────────────────── */
const FormField = ({ label, fieldKey, form, set, step = '0.1', required = false, tooltip = '' }: any) => (
  <div>
    <label className="field-label">
      {tooltip
        ? <span className="tooltip-container">{label}<span className="tooltip-text">{tooltip}</span></span>
        : label}
    </label>
    <input
      type="number"
      step={step}
      className="input-field"
      value={form[fieldKey] !== undefined ? form[fieldKey] : ''}
      onChange={e => set(fieldKey, e.target.value)}
      required={required}
      placeholder="Enter value…"
    />
  </div>
);

/* ─── REPORT TAB ─────────────────────────────────────── */
function ReportTab() {
  const { isAdmin, save } = useAuth();
  const [progressData] = useLocalStorage<any[]>('progressData', []);
  const latestData = progressData.length > 0 ? progressData[progressData.length - 1] : {};

  // Override static data with latest dynamic data safely by merging
  const personalInfo = {
    ...fitnessData.personalInfo,
    score: Number(latestData.score) || fitnessData.personalInfo.score,
    bodyAge: Number(latestData.bodyAge) || fitnessData.personalInfo.bodyAge
  };
  const bodyComponent = {
    ...fitnessData.bodyComponent,
    weight: { ...fitnessData.bodyComponent.weight, value: Number(latestData.weight) || fitnessData.bodyComponent.weight.value },
    water: { ...fitnessData.bodyComponent.water, value: Number(latestData.water) || fitnessData.bodyComponent.water.value },
    protein: { ...fitnessData.bodyComponent.protein, value: Number(latestData.protein) || fitnessData.bodyComponent.protein.value },
    fat: { ...fitnessData.bodyComponent.fat, value: Number(latestData.fat) || fitnessData.bodyComponent.fat.value },
    inorganicSalt: { ...fitnessData.bodyComponent.inorganicSalt, value: Number(latestData.salt) || fitnessData.bodyComponent.inorganicSalt.value }
  };
  const obesityAnalysis = {
    ...fitnessData.obesityAnalysis,
    bmi: { ...fitnessData.obesityAnalysis.bmi, value: Number(latestData.bmi) || fitnessData.obesityAnalysis.bmi.value },
    bmr: { ...fitnessData.obesityAnalysis.bmr, value: Number(latestData.bmr) || fitnessData.obesityAnalysis.bmr.value },
    whr: { ...fitnessData.obesityAnalysis.whr, value: Number(latestData.whr) || fitnessData.obesityAnalysis.whr.value },
    ffm: { ...fitnessData.obesityAnalysis.ffm, value: Number(latestData.ffm) || fitnessData.obesityAnalysis.ffm.value }
  };
  const fatAnalysis = {
    ...fitnessData.fatAnalysis,
    pbf: { ...fitnessData.fatAnalysis.pbf, value: Number(latestData.pbf) || fitnessData.fatAnalysis.pbf.value },
    trunkFatMass: { ...fitnessData.fatAnalysis.trunkFatMass, value: Number(latestData.trunkFat) || fitnessData.fatAnalysis.trunkFatMass.value },
    visceralFatIndex: { ...fitnessData.fatAnalysis.visceralFatIndex, value: Number(latestData.vfi) || fitnessData.fatAnalysis.visceralFatIndex.value }
  };
  const muscleAnalysis = {
    ...fitnessData.muscleAnalysis,
    muscle: { ...fitnessData.muscleAnalysis.muscle, value: Number(latestData.muscle) || fitnessData.muscleAnalysis.muscle.value },
    smm: { ...fitnessData.muscleAnalysis.smm, value: Number(latestData.smm) || fitnessData.muscleAnalysis.smm.value }
  };
  const edemaAnalysis = {
    ...fitnessData.edemaAnalysis,
    bodyWaterPercent: Number(latestData.bodyWaterPct) || fitnessData.edemaAnalysis.bodyWaterPercent,
    intracellularWater: Number(latestData.icw) || fitnessData.edemaAnalysis.intracellularWater,
    extracellularWater: Number(latestData.ecw) || fitnessData.edemaAnalysis.extracellularWater
  };
  const segmentalAnalysis = {
    ...fitnessData.segmentalAnalysis,
    muscle: {
      ...fitnessData.segmentalAnalysis.muscle,
      rightArm: Number(latestData.raMuscle) || fitnessData.segmentalAnalysis.muscle.rightArm,
      leftArm: Number(latestData.laMuscle) || fitnessData.segmentalAnalysis.muscle.leftArm,
      trunk: Number(latestData.tMuscle) || fitnessData.segmentalAnalysis.muscle.trunk,
      rightLeg: Number(latestData.rlMuscle) || fitnessData.segmentalAnalysis.muscle.rightLeg,
      leftLeg: Number(latestData.llMuscle) || fitnessData.segmentalAnalysis.muscle.leftLeg
    },
    fat: {
      ...fitnessData.segmentalAnalysis.fat,
      rightArm: Number(latestData.raFat) || fitnessData.segmentalAnalysis.fat.rightArm,
      leftArm: Number(latestData.laFat) || fitnessData.segmentalAnalysis.fat.leftArm,
      trunk: Number(latestData.tFat) || fitnessData.segmentalAnalysis.fat.trunk,
      rightLeg: Number(latestData.rlFat) || fitnessData.segmentalAnalysis.fat.rightLeg,
      leftLeg: Number(latestData.llFat) || fitnessData.segmentalAnalysis.fat.leftLeg
    }
  };
  const weightManagement = fitnessData.weightManagement;

  const bodyCompData = [
    { name: 'Water 💧', value: bodyComponent.water.value, color: '#00f2fe' },
    { name: 'Protein 🥩', value: bodyComponent.protein.value, color: '#4facfe' },
    { name: 'Fat 🥓', value: bodyComponent.fat.value, color: '#f59e0b' },
    { name: 'Salt 🧂', value: bodyComponent.inorganicSalt.value, color: '#94a3b8' },
  ];

  const [userProfile, setUserProfile] = useLocalStorage('userProfile', {
    name: 'Fitness Enthusiast',
    dob: '1998-05-15',
    height: personalInfo.height,
    gymJoinedDate: toDateStr(new Date(new Date().getFullYear(), 0, 1))
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(userProfile);



  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile(profileForm);
    setIsEditingProfile(false);
    
    await save({ personalInfo: profileForm });
  };

  const latestReport = progressData[progressData.length - 1] || {};
  const currentScore = latestReport.score ?? personalInfo.score;
  const currentBodyAge = latestReport.bodyAge ?? personalInfo.bodyAge;
  const currentBodyType = latestReport.bodyType ?? fitnessData.bodyType;

  return (
    <div className="tab-content fade-in">

      {/* ── Profile Hero ── */}
      <div className="hero-card mb-6">
        <div className="hero-left" style={{ width: isEditingProfile ? '100%' : 'auto' }}>
          <div className="avatar-circle">
            <User size={36} color="white" />
          </div>
          {isEditingProfile ? (
            <form onSubmit={handleProfileSave} className="flex flex-col gap-2" style={{ flex: 1 }}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="field-label" style={{ fontSize: '0.75rem', marginBottom: '0.1rem' }}>Name</label>
                  <input className="input-field" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="field-label" style={{ fontSize: '0.75rem', marginBottom: '0.1rem' }}>DOB</label>
                  <input type="date" className="input-field" value={profileForm.dob} onChange={e => setProfileForm(f => ({ ...f, dob: e.target.value }))} required />
                </div>
                <div>
                  <label className="field-label" style={{ fontSize: '0.75rem', marginBottom: '0.1rem' }}>Height (cm)</label>
                  <input type="number" className="input-field" value={profileForm.height} onChange={e => setProfileForm(f => ({ ...f, height: Number(e.target.value) }))} required />
                </div>
                <div>
                  <label className="field-label" style={{ fontSize: '0.75rem', marginBottom: '0.1rem' }}>Gym Joined Date</label>
                  <input type="date" className="input-field" value={profileForm.gymJoinedDate} onChange={e => setProfileForm(f => ({ ...f, gymJoinedDate: e.target.value }))} required />
                </div>
              </div>
              <div className="flex gap-2 mt-1 flex-wrap">
                <button type="submit" className="submit-btn" style={{ padding: '0.4rem', fontSize: '0.9rem' }}>💾 Save</button>
                <button type="button" className="tab-btn" onClick={() => { setIsEditingProfile(false); setProfileForm(userProfile); }}>Cancel</button>
              </div>
            </form>
          ) : (
            <div>
              <h2 className="hero-id" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {userProfile.name}
                {isAdmin && <button onClick={() => setIsEditingProfile(true)} className="tab-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>✏️ Edit</button>}
              </h2>
              <p className="hero-sub">
                🎂 {Math.floor((new Date().getTime() - parseDateStr(userProfile.dob).getTime()) / 31557600000)} yrs
                &nbsp;•&nbsp; 📏 {userProfile.height} cm
                &nbsp;•&nbsp; 🏋️ Joined: {userProfile.gymJoinedDate}
              </p>
            </div>
          )}
        </div>
        {!isEditingProfile && (
          <div className="hero-scores">
            <div className="score-pill">
              <div className="score-label">⭐ Fitness Score</div>
              <div className="score-value gradient-text">{currentScore}</div>
            </div>
            <div className="score-pill">
              <div className="score-label">🧬 Body Age</div>
              <div className="score-value">{currentBodyAge}</div>
            </div>
            <div className="score-pill">
              <div className="score-label">🏃 Body Type</div>
              <div className="score-value">
                <span className={`badge ${String(currentBodyType).toLowerCase().includes('obese') ? 'badge-warning animate-shake' : 'badge-success'}`}>
                  {currentBodyType} {String(currentBodyType).toLowerCase().includes('obese') ? '⚠️' : '✓'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 1. Core Metrics ── */}
      <Section title="Core Body Metrics" icon={<Scale size={18} color="var(--accent)" />}>
        <div className="table-scroll"><table className="data-table">
          <thead>
            <tr><th>Metric</th><th>Value</th><th className="col-range">Normal Range</th><th>Status</th></tr>
          </thead>
          <tbody>
            <MetricRow label="⚖️ Weight" value={bodyComponent.weight.value} unit="KG" min={bodyComponent.weight.min} max={bodyComponent.weight.max} isHighBad tooltip="Your total body weight." />
            <MetricRow label="📉 BMI" value={obesityAnalysis.bmi.value} unit="" min={obesityAnalysis.bmi.min} max={obesityAnalysis.bmi.max} isHighBad tooltip="Body Mass Index — weight relative to height." />
            <MetricRow label="📏 Waist-Hip Ratio" value={obesityAnalysis.whr.value} unit="" min={obesityAnalysis.whr.min} max={obesityAnalysis.whr.max} isHighBad tooltip="Ratio of waist to hip circumference." />
            <MetricRow label="🔥 BMR" value={obesityAnalysis.bmr.value} unit="Kcal" tooltip="Basal Metabolic Rate — calories burned at rest." />
            <MetricRow label="⚙️ Fat Free Mass" value={obesityAnalysis.ffm.value} unit="KG" tooltip="Everything in your body that isn't fat." />
          </tbody>
        </table></div>
      </Section>

      {/* ── 2. Body Composition ── */}
      <Section title="Body Composition" icon={<PieChartIcon size={18} color="var(--accent)" />}>
        <div className="two-col-layout">
          <div className="table-scroll"><table className="data-table">
            <thead>
              <tr><th>Component</th><th>Value</th><th className="col-range">Normal Range</th><th>Status</th></tr>
            </thead>
            <tbody>
              <MetricRow label="💧 Water" value={bodyComponent.water.value} unit="KG" min={bodyComponent.water.min} max={bodyComponent.water.max} tooltip="Total body water." />
              <MetricRow label="🥩 Protein" value={bodyComponent.protein.value} unit="KG" min={bodyComponent.protein.min} max={bodyComponent.protein.max} tooltip="Total protein in your body." />
              <MetricRow label="🥓 Fat Mass" value={bodyComponent.fat.value} unit="KG" min={bodyComponent.fat.min} max={bodyComponent.fat.max} isHighBad tooltip="Total fat mass." />
              <MetricRow label="🧂 Inorganic Salt" value={bodyComponent.inorganicSalt.value} unit="KG" min={bodyComponent.inorganicSalt.min} max={bodyComponent.inorganicSalt.max} tooltip="Mineral/salt content in bones and cells." />
            </tbody>
          </table></div>
          <div className="pie-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bodyCompData} cx="50%" cy="50%" innerRadius={60} outerRadius={88} paddingAngle={4} dataKey="value" stroke="none">
                  {bodyCompData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-main)' }} />
                <Legend 
                  verticalAlign="bottom" 
                  iconSize={10} 
                  wrapperStyle={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    whiteSpace: 'nowrap', 
                    fontSize: '11px',
                    marginLeft: '-10px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      {/* ── Row: Fat + Muscle side by side ── */}
      <div className="sections-grid">
        {/* ── 3. Fat Analysis ── */}
        <Section title="Fat Analysis 🥓" icon={<Flame size={18} color="var(--warning)" />}>
          <div className="table-scroll"><table className="data-table">
            <thead>
              <tr><th>Metric</th><th>Value</th><th className="col-range">Range</th><th>Status</th></tr>
            </thead>
            <tbody>
              <MetricRow label="Percent Body Fat" value={fatAnalysis.pbf.value} unit="%" min={fatAnalysis.pbf.min} max={fatAnalysis.pbf.max} isHighBad tooltip="PBF: % of total weight that is fat." />
              <MetricRow label="Trunk Fat Mass" value={fatAnalysis.trunkFatMass.value} unit="KG" min={fatAnalysis.trunkFatMass.min} max={fatAnalysis.trunkFatMass.max} isHighBad tooltip="Fat concentrated in the torso area." />
              <MetricRow label="Visceral Fat Index" value={fatAnalysis.visceralFatIndex.value} unit="" min={fatAnalysis.visceralFatIndex.min} max={fatAnalysis.visceralFatIndex.max} isHighBad tooltip="Dangerous fat surrounding internal organs. Healthy range: 1 – 10." />
            </tbody>
          </table></div>
        </Section>

        {/* ── 4. Muscle Analysis ── */}
        <Section title="Muscle Analysis 💪" icon={<Dumbbell size={18} color="var(--success)" />}>
          <div className="table-scroll"><table className="data-table">
            <thead>
              <tr><th>Metric</th><th>Value</th><th className="col-range">Range</th><th>Status</th></tr>
            </thead>
            <tbody>
              <MetricRow label="Muscle Mass" value={muscleAnalysis.muscle.value} unit="KG" min={muscleAnalysis.muscle.min} max={muscleAnalysis.muscle.max} tooltip="Total muscle in your body." />
              <MetricRow label="Skeletal Muscle (SMM)" value={muscleAnalysis.smm.value} unit="KG" min={muscleAnalysis.smm.min} max={muscleAnalysis.smm.max} tooltip="Muscle attached to bones — grows with exercise." />
              <MetricRow label="Protein Content" value={muscleAnalysis.protein.value} unit="KG" min={muscleAnalysis.protein.min} max={muscleAnalysis.protein.max} tooltip="Protein stored in muscle tissue." />
            </tbody>
          </table></div>
        </Section>

        {/* ── 5. Segmental Analysis ── */}
        <Section title="Segmental Analysis 🦵" icon={<Activity size={18} color="var(--accent)" />}>
          <div className="table-scroll"><table className="data-table">
            <thead>
              <tr><th>Segment</th><th>💪 Muscle KG</th><th>🥓 Fat KG</th></tr>
            </thead>
            <tbody>
              {[
                { seg: '🦾 Right Arm', m: segmentalAnalysis.muscle.rightArm, f: segmentalAnalysis.fat.rightArm },
                { seg: '🦾 Left Arm',  m: segmentalAnalysis.muscle.leftArm,  f: segmentalAnalysis.fat.leftArm },
                { seg: '🫁 Trunk',     m: segmentalAnalysis.muscle.trunk,     f: segmentalAnalysis.fat.trunk },
                { seg: '🦵 Right Leg', m: segmentalAnalysis.muscle.rightLeg,  f: segmentalAnalysis.fat.rightLeg },
                { seg: '🦵 Left Leg',  m: segmentalAnalysis.muscle.leftLeg,   f: segmentalAnalysis.fat.leftLeg },
              ].map(r => (
                <tr key={r.seg} className="metric-row">
                  <td>{r.seg}</td>
                  <td className="metric-value" style={{ color: 'var(--success)' }}>{r.m}</td>
                  <td className="metric-value" style={{ color: 'var(--warning)' }}>{r.f}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Section>

        {/* ── 6. Water & Edema ── */}
        <Section title="Hydration & Edema 💧" icon={<Droplets size={18} color="#00f2fe" />}>
          <div className="table-scroll"><table className="data-table">
            <thead>
              <tr><th>Metric</th><th>Value</th><th className="col-range">Range</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr className="metric-row">
                <td>🩺 Edema Status</td>
                <td className="metric-value" style={{ color: 'var(--text-muted)' }}>-</td>
                <td className="metric-range">-</td>
                <td><span className="badge badge-success">{edemaAnalysis.status} ✓</span></td>
              </tr>
              <MetricRow label="Edema Index" value={edemaAnalysis.edemaIndex.value} unit="" min={edemaAnalysis.edemaIndex.min} max={edemaAnalysis.edemaIndex.max} isHighBad tooltip="ECW/TBW ratio — high may indicate swelling." />
              <MetricRow label="Body Water %" value={edemaAnalysis.bodyWaterPercent} unit="%" tooltip="Total body water as % of weight." />
              <MetricRow label="Intracellular H₂O" value={edemaAnalysis.intracellularWater} unit="L" tooltip="Water inside your cells." />
              <MetricRow label="Extracellular H₂O" value={edemaAnalysis.extracellularWater} unit="L" tooltip="Water outside cells — high = possible inflammation." />
            </tbody>
          </table></div>
        </Section>
      </div>

      {/* ── 7. Weight Management Goal ── */}
      <Section title="Weight Management Goals" icon={<Target size={18} color="var(--warning)" />}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1.5rem', padding: '0.5rem 0' }}>
          
          {/* Current vs Target Weight */}
          <div className="goal-grid" style={{ margin: 0, padding: 0, gap: '1rem' }}>
            <div className="goal-current">
              <div className="goal-label">Current Weight</div>
              <div className="goal-num" style={{ fontSize: '1.6rem' }}>{bodyComponent.weight.value} <span>KG</span></div>
            </div>
            <div className="goal-arrow" style={{ fontSize: '1.4rem' }}>➜</div>
            <div className="goal-target">
              <div className="goal-label">Target Weight</div>
              <div className="goal-num gradient-text" style={{ fontSize: '1.6rem' }}>{weightManagement.targetWeight} <span>KG</span></div>
            </div>
          </div>

          {/* Actionable Metrics */}
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>⚖️ Weight to Lose</div>
              <div style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '1rem' }}>{weightManagement.weightControl} KG</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>🥓 Fat to Reduce</div>
              <div style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '1rem' }}>{weightManagement.fatControl} KG</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>💪 Muscle to Gain</div>
              <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '1rem' }}>+{weightManagement.muscleControl} KG</div>
            </div>
          </div>

        </div>
      </Section>

    </div>
  );
}

/* ─── PROGRESS TAB ───────────────────────────────────── */
type Series = { key: string; name: string; color: string };

function ChartCard({ title, icon, hint, data, series, area = false, unit = '' }: {
  title: string; icon: string; hint: string; data: any[]; series: Series[]; area?: boolean; unit?: string;
}) {
  // Only draw series that have at least one value in the selected range
  const active = series.filter(sr => data.some(d => d[sr.key] !== null && d[sr.key] !== undefined));
  if (active.length === 0) return null;
  const Chart: any = area ? AreaChart : LineChart;
  return (
    <div className="glass-panel chart-card">
      <div className="chart-card-title">{icon} {title}{unit && <span className="metric-unit"> ({unit})</span>}</div>
      <p className="chart-card-hint">{hint}{data.length === 1 && ' · Add more reports to see a trend line.'}</p>
      <div className="line-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} domain={area ? [0, 'auto'] : ['auto', 'auto']} width={46} />
            <RechartsTooltip
              labelFormatter={(_l: any, p: any) => p?.[0]?.payload?.date ?? ''}
              contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-main)', padding: '6px 10px', fontSize: 12 }}
              labelStyle={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}
              itemStyle={{ fontSize: 12, padding: '1px 0' }}
              wrapperStyle={{ zIndex: 10 }}
            />
            <Legend iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
            {active.map(sr => area
              ? <Area key={sr.key} type="monotone" dataKey={sr.key} name={sr.name} stroke={sr.color} fill={sr.color} fillOpacity={0.25} stackId="1" connectNulls />
              : <Line key={sr.key} type="monotone" dataKey={sr.key} name={sr.name} stroke={sr.color} strokeWidth={2} dot={data.length > 12 ? false : { r: 2 }} activeDot={{ r: 4 }} connectNulls />
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ProgressTab() {
  const [progressData] = useLocalStorage<any[]>('progressData', []);
  const [range, setRange] = useState<'5' | '10' | 'all'>('all');

  const sorted = [...progressData].sort((a, b) => parseDateStr(a.date).getTime() - parseDateStr(b.date).getTime());
  const shown = range === 'all' ? sorted : sorted.slice(-Number(range));
  // Blank form fields are stored as '' - turn them into null so charts skip them
  const data = shown.map(r => {
    const row: any = { date: r.date, label: parseDateStr(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) };
    Object.keys(r).forEach(k => {
      if (k === 'date' || k === 'bodyType') return;
      const n = r[k] === '' || r[k] === null || r[k] === undefined ? NaN : Number(r[k]);
      row[k] = Number.isFinite(n) ? n : null;
    });
    return row;
  });

  const exportData = () => {
    if (progressData.length === 0) return alert('No data to export');
    const esc = (v: unknown) => {
      const t = String(v ?? '');
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const keys = Array.from(new Set(progressData.flatMap((r: any) => Object.keys(r))));
    const csv = [keys.join(','), ...progressData.map((r: any) => keys.map(k => esc(r[k])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fitness_data.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (progressData.length === 0) {
    return (
      <div className="tab-content fade-in">
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <TrendingUp size={48} style={{ margin: '0 auto 1rem', color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Progress Yet</h2>
          <p style={{ color: 'var(--text-muted)' }}>Log a report to start seeing your trends here. 📝</p>
        </div>
      </div>
    );
  }

  // Summary: first vs latest value in the selected range. goodWhen = which direction is an improvement.
  const summary: { key: string; label: string; unit: string; goodWhen: 'down' | 'up'; dec?: number }[] = [
    { key: 'weight', label: 'Weight', unit: 'KG', goodWhen: 'down' },
    { key: 'bmi', label: 'BMI', unit: '', goodWhen: 'down' },
    { key: 'pbf', label: 'Body Fat %', unit: '%', goodWhen: 'down' },
    { key: 'fat', label: 'Fat Mass', unit: 'KG', goodWhen: 'down' },
    { key: 'muscle', label: 'Muscle Mass', unit: 'KG', goodWhen: 'up' },
    { key: 'smm', label: 'Skeletal Muscle', unit: 'KG', goodWhen: 'up' },
    { key: 'vfi', label: 'Visceral Fat', unit: '', goodWhen: 'down', dec: 0 },
    { key: 'score', label: 'Fitness Score', unit: '', goodWhen: 'up', dec: 0 },
    { key: 'bodyAge', label: 'Body Age', unit: 'yrs', goodWhen: 'down', dec: 0 },
  ];
  const valuesOf = (k: string) => data.map(d => d[k]).filter((v: any) => v !== null) as number[];

  const S = (key: string, name: string, color: string): Series => ({ key, name, color });

  return (
    <div className="tab-content fade-in">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex gap-2 segmented">
          {([['5', 'Last 5'], ['10', 'Last 10'], ['all', 'All Time']] as const).map(([v, l]) => (
            <button key={v} className={`tab-btn ${range === v ? 'active' : ''}`} onClick={() => setRange(v)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>{l}</button>
          ))}
        </div>
        <button className="tab-btn" onClick={exportData} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      <p className="section-note">
        Showing {data.length} report{data.length === 1 ? '' : 's'}
        {data.length > 0 && <> · {data[0].date} → {data[data.length - 1].date}</>}
      </p>

      {/* Change summary */}
      <div className="summary-grid mb-6">
        {summary.map(m => {
          const v = valuesOf(m.key);
          if (v.length === 0) return null;
          const first = v[0], last = v[v.length - 1], diff = last - first;
          const dec = m.dec ?? 1;
          const improving = diff === 0 ? null : (m.goodWhen === 'down' ? diff < 0 : diff > 0);
          const color = improving === null ? 'var(--text-muted)' : improving ? 'var(--success)' : 'var(--warning)';
          return (
            <div key={m.key} className="glass-panel summary-card">
              <div className="summary-label">{m.label}</div>
              <div className="summary-value">{last.toFixed(dec)}<span className="metric-unit"> {m.unit}</span></div>
              <div className="summary-delta" style={{ color }}>
                {diff === 0 ? <Minus size={14} /> : diff > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                {diff === 0 ? 'No change' : `${Math.abs(diff).toFixed(dec)} ${m.unit}`}
              </div>
              <div className="summary-from">from {first.toFixed(dec)}</div>
            </div>
          );
        })}
      </div>

      <div className="charts-grid">
        <ChartCard title="Weight" icon="⚖️" unit="KG" hint="Total body weight over time." data={data}
          series={[S('weight', 'Weight', '#f43f5e')]} />
        <ChartCard title="BMI" icon="📉" hint="Body Mass Index — healthy range is roughly 18.5 – 24.9." data={data}
          series={[S('bmi', 'BMI', '#ec4899')]} />
        <ChartCard title="Fat vs Muscle" icon="💪" unit="KG" hint="Goal: fat going down while muscle stays steady or rises." data={data}
          series={[S('fat', 'Fat Mass', '#f59e0b'), S('muscle', 'Muscle Mass', '#10b981'), S('smm', 'Skeletal Muscle', '#8b5cf6')]} />
        <ChartCard title="Body Fat %" icon="📊" hint="Percent body fat — fat as a share of total weight. Lower is generally better." data={data}
          series={[S('pbf', 'PBF', '#3b82f6')]} />
        <ChartCard title="Visceral Fat & Trunk Fat" icon="🥓" hint="Visceral fat index (organ fat) and trunk fat mass in KG." data={data}
          series={[S('vfi', 'Visceral Fat Index', '#ef4444'), S('trunkFat', 'Trunk Fat (KG)', '#f97316')]} />
        <ChartCard title="Fitness Score & Body Age" icon="⭐" hint="Higher score and lower body age mean better overall condition." data={data}
          series={[S('score', 'Fitness Score', '#84cc16'), S('bodyAge', 'Body Age', '#06b6d4')]} />
        <ChartCard title="Body Composition" icon="🧪" unit="KG" area hint="Stacked makeup of the body: water, protein, fat and minerals." data={data}
          series={[S('water', 'Water', '#00f2fe'), S('protein', 'Protein', '#4facfe'), S('fat', 'Fat', '#f59e0b'), S('salt', 'Inorganic Salt', '#94a3b8')]} />
        <ChartCard title="Metabolism & Lean Mass" icon="🔥" hint="BMR (Kcal/day) and Fat Free Mass (KG)." data={data}
          series={[S('bmr', 'BMR (Kcal)', '#f43f5e'), S('ffm', 'Fat Free Mass (KG)', '#10b981')]} />
        <ChartCard title="Hydration" icon="💧" hint="Body water % plus intracellular / extracellular water in litres." data={data}
          series={[S('bodyWaterPct', 'Body Water %', '#00b4d8'), S('icw', 'Intracellular (L)', '#4facfe'), S('ecw', 'Extracellular (L)', '#a78bfa')]} />
        <ChartCard title="Segmental Muscle" icon="🦾" unit="KG" hint="Muscle mass per body part." data={data}
          series={[S('raMuscle', 'Right Arm', '#f43f5e'), S('laMuscle', 'Left Arm', '#f59e0b'), S('tMuscle', 'Trunk', '#10b981'), S('rlMuscle', 'Right Leg', '#3b82f6'), S('llMuscle', 'Left Leg', '#8b5cf6')]} />
        <ChartCard title="Segmental Fat" icon="🦵" unit="KG" hint="Fat mass per body part." data={data}
          series={[S('raFat', 'Right Arm', '#f43f5e'), S('laFat', 'Left Arm', '#f59e0b'), S('tFat', 'Trunk', '#10b981'), S('rlFat', 'Right Leg', '#3b82f6'), S('llFat', 'Left Leg', '#8b5cf6')]} />
      </div>

      <CompareSection progressData={sorted} />
    </div>
  );
}

/* ─── DAILY LOG TAB ──────────────────────────────────── */
function DailyLogTab() {
  const { isAdmin, save } = useAuth();
  const [gymDates, setGymDates] = useLocalStorage<string[]>('gymDates', []);
  const [userProfile] = useLocalStorage('userProfile', { gymJoinedDate: '2026-01-01' });
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

  const days: React.ReactNode[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`e-${i}`} className="calendar-day empty" />);
  
  const joinD = parseDateStr(userProfile.gymJoinedDate || '2026-01-01');
  joinD.setHours(0,0,0,0);
  const todayOnly = new Date();
  todayOnly.setHours(0,0,0,0);

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
    const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  return (
    <div className="tab-content fade-in">
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

/* ─── NEW REPORT TAB ─────────────────────────────────── */
function NewReportTab() {
  const { save } = useAuth();
  const [progressData, setProgressData] = useLocalStorage('progressData', [
    {
      date: toDateStr(new Date()),
      weight: fitnessData.bodyComponent.weight.value,
      fat: fitnessData.bodyComponent.fat.value,
      muscle: fitnessData.muscleAnalysis.muscle.value,
      pbf: fitnessData.fatAnalysis.pbf.value,
      smm: fitnessData.muscleAnalysis.smm.value,
      bmr: fitnessData.obesityAnalysis.bmr.value,
      whr: fitnessData.obesityAnalysis.whr.value,
      ffm: fitnessData.obesityAnalysis.ffm.value,
      vfi: fitnessData.fatAnalysis.visceralFatIndex.value,
      bmi: fitnessData.obesityAnalysis.bmi.value,
      score: fitnessData.personalInfo.score,
      bodyAge: fitnessData.personalInfo.bodyAge,
      bodyType: fitnessData.bodyType,
      protein: fitnessData.bodyComponent.protein.value,
      water: fitnessData.bodyComponent.water.value,
      salt: fitnessData.bodyComponent.inorganicSalt.value,
      trunkFat: fitnessData.fatAnalysis.trunkFatMass.value,
      bodyWaterPct: fitnessData.edemaAnalysis.bodyWaterPercent,
      icw: fitnessData.edemaAnalysis.intracellularWater,
      ecw: fitnessData.edemaAnalysis.extracellularWater,
      raMuscle: fitnessData.segmentalAnalysis.muscle.rightArm,
      laMuscle: fitnessData.segmentalAnalysis.muscle.leftArm,
      tMuscle: fitnessData.segmentalAnalysis.muscle.trunk,
      rlMuscle: fitnessData.segmentalAnalysis.muscle.rightLeg,
      llMuscle: fitnessData.segmentalAnalysis.muscle.leftLeg,
      raFat: fitnessData.segmentalAnalysis.fat.rightArm,
      laFat: fitnessData.segmentalAnalysis.fat.leftArm,
      tFat: fitnessData.segmentalAnalysis.fat.trunk,
      rlFat: fitnessData.segmentalAnalysis.fat.rightLeg,
      llFat: fitnessData.segmentalAnalysis.fat.leftLeg
    }
  ]);

  const blank = {
    date: toDateStr(new Date()),
    weight: '', fat: '', muscle: '', pbf: '', smm: '', bmr: '', whr: '', ffm: '', vfi: '', bmi: '',
    score: '', bodyAge: '', bodyType: '',
    protein: '', water: '', salt: '', trunkFat: '', bodyWaterPct: '', icw: '', ecw: '',
    raMuscle: '', laMuscle: '', tMuscle: '', rlMuscle: '', llMuscle: '',
    raFat: '', laFat: '', tFat: '', rlFat: '', llFat: ''
  };
  const [form, setForm] = useState<any>(blank);
  const [showSuccess, setShowSuccess] = useState(false);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newData: any = { ...form };
    Object.keys(newData).forEach(k => {
      if (k !== 'date' && k !== 'bodyType' && newData[k] !== '') newData[k] = Number(newData[k]);
    });
    const updatedData = [...progressData.filter((d: any) => d.date !== form.date), newData]
      .sort((a, b) => parseDateStr(a.date).getTime() - parseDateStr(b.date).getTime());
    setProgressData(updatedData);

    await save({ progressData: updatedData });

    setForm(blank);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3500);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (record: any) => {
    setForm({ ...blank, ...record });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="tab-content fade-in">
      <div style={{ width: '100%', margin: '0 auto' }}>
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title"><Plus size={18} /> 📋 Log Fitness Report</div>
          </div>

          {showSuccess && (
            <div className="success-banner">✅ Report saved successfully!</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Date */}
            <div className="form-section-header">🗓 Report Date</div>
            <div>
              <label className="field-label">Date (Editing this overrides the record for this date)</label>
              <DatePicker 
                selected={form.date ? parseDateStr(form.date) : new Date()} 
                onChange={(d: Date | null) => d && set('date', toDateStr(d))} 
                className="input-field" 
                dateFormat="yyyy-MM-dd" 
                required 
              />
            </div>

            {/* Overall Summary */}
            <div className="form-section-header">⭐ Overall Summary</div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Fitness Score" fieldKey="score" />
              <FormField form={form} set={set} label="Body Age" fieldKey="bodyAge" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Body Type</label>
                <input className="input-field" value={form.bodyType || ''} onChange={e => set('bodyType', e.target.value)} placeholder="e.g. Normal, Obese" />
              </div>
            </div>

            {/* Core */}
            <div className="form-section-header">⚖️ Core Metrics</div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Weight (KG)" fieldKey="weight" required />
              <FormField form={form} set={set} label="BMI" fieldKey="bmi" step="0.01" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="BMR (Kcal)" fieldKey="bmr" />
              <FormField form={form} set={set} label="Waist-Hip Ratio" fieldKey="whr" step="0.01" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Fat Free Mass (KG)" fieldKey="ffm" />
            </div>

            {/* Body Composition */}
            <div className="form-section-header">📊 Body Composition</div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Water (KG)" fieldKey="water" />
              <FormField form={form} set={set} label="Protein (KG)" fieldKey="protein" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Body Fat Mass (KG)" fieldKey="fat" required />
              <FormField form={form} set={set} label="Inorganic Salt (KG)" fieldKey="salt" step="0.01" />
            </div>

            {/* Fat & Muscle */}
            <div className="form-section-header">🥓 Fat & Muscle Analysis</div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Percent Body Fat (%)" fieldKey="pbf" required />
              <FormField form={form} set={set} label="Trunk Fat Mass (KG)" fieldKey="trunkFat" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Muscle Mass (KG)" fieldKey="muscle" required />
              <FormField form={form} set={set} label="Skeletal Muscle (KG)" fieldKey="smm" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Visceral Fat Index" fieldKey="vfi" />
            </div>

            {/* Hydration */}
            <div className="form-section-header">💧 Hydration</div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Body Water (%)" fieldKey="bodyWaterPct" />
              <FormField form={form} set={set} label="Intracellular Water (L)" fieldKey="icw" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Extracellular Water (L)" fieldKey="ecw" />
            </div>

            {/* Segmental Muscle */}
            <div className="form-section-header">💪 Segmental Muscle (KG)</div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Right Arm Muscle" fieldKey="raMuscle" />
              <FormField form={form} set={set} label="Left Arm Muscle" fieldKey="laMuscle" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Right Leg Muscle" fieldKey="rlMuscle" />
              <FormField form={form} set={set} label="Left Leg Muscle" fieldKey="llMuscle" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Trunk Muscle" fieldKey="tMuscle" />
            </div>

            {/* Segmental Fat */}
            <div className="form-section-header">🥓 Segmental Fat (KG)</div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Right Arm Fat" fieldKey="raFat" />
              <FormField form={form} set={set} label="Left Arm Fat" fieldKey="laFat" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Right Leg Fat" fieldKey="rlFat" />
              <FormField form={form} set={set} label="Left Leg Fat" fieldKey="llFat" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField form={form} set={set} label="Trunk Fat" fieldKey="tFat" />
            </div>

            <button type="submit" className="submit-btn" style={{ marginTop: '1rem', fontSize: '1rem', padding: '0.85rem' }}>
              💾 Save Report
            </button>
          </form>
        </div>

        {/* History Table */}
        {progressData.length > 0 && (
          <div className="glass-panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-header">
              <div className="panel-title"><TrendingUp size={18} /> 📅 History</div>
            </div>
            <div>
              <div className="table-scroll"><table className="data-table history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Weight</th>
                    <th>Fat</th>
                    <th>Muscle</th>
                    <th>PBF%</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...progressData].reverse().map((r: any) => (
                    <tr key={r.date} className="metric-row">
                      <td>{r.date}</td>
                      <td className="metric-value">{r.weight} <span className="metric-unit">KG</span></td>
                      <td className="metric-value" style={{ color: 'var(--warning)' }}>{r.fat} <span className="metric-unit">KG</span></td>
                      <td className="metric-value" style={{ color: 'var(--success)' }}>{r.muscle} <span className="metric-unit">KG</span></td>
                      <td className="metric-value" style={{ color: '#3b82f6' }}>{r.pbf ?? '–'} <span className="metric-unit">%</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => handleEdit(r)} className="tab-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── COMPARE SECTION (inside Progress tab) ──────────────── */
function CompareSection({ progressData }: { progressData: any[] }) {
  const sorted = [...progressData].sort((a, b) => parseDateStr(a.date).getTime() - parseDateStr(b.date).getTime());
  const [date1, setDate1] = useState(sorted.length > 1 ? sorted[sorted.length - 2].date : sorted[0]?.date || '');
  const [date2, setDate2] = useState(sorted.length > 0 ? sorted[sorted.length - 1].date : '');

  const data1 = sorted.find(d => d.date === date1) || sorted[0];
  const data2 = sorted.find(d => d.date === date2) || sorted[0];

  // lowerIsBetter: a drop in this metric is an improvement
  const metrics = [
    { label: 'Weight (kg)', key: 'weight', lowerIsBetter: true },
    { label: 'Skeletal Muscle (kg)', key: 'smm' },
    { label: 'Muscle Mass (kg)', key: 'muscle' },
    { label: 'Body Fat Mass (kg)', key: 'fat', lowerIsBetter: true },
    { label: 'Percent Body Fat (%)', key: 'pbf', lowerIsBetter: true },
    { label: 'BMI', key: 'bmi', lowerIsBetter: true },
    { label: 'Visceral Fat Index', key: 'vfi', lowerIsBetter: true },
    { label: 'Trunk Fat (kg)', key: 'trunkFat', lowerIsBetter: true },
    { label: 'InBody Score', key: 'score' },
    { label: 'Body Age', key: 'bodyAge', lowerIsBetter: true },
    { label: 'BMR (Kcal)', key: 'bmr' },
    { label: 'Fat Free Mass (kg)', key: 'ffm' },
    { label: 'Total Body Water (L)', key: 'water' },
    { label: 'Protein (kg)', key: 'protein' },
    { label: 'Inorganic Salt (kg)', key: 'salt' },
  ];

  if (sorted.length < 2) {
    return (
      <div className="glass-panel mt-8" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
        <GitCompare size={36} style={{ margin: '0 auto 0.75rem', color: 'var(--accent)' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Compare Two Reports</h2>
        <p style={{ color: 'var(--text-muted)' }}>Log at least two reports to compare them side by side.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel mt-8">
      <div className="panel-header">
        <div className="panel-title"><GitCompare size={18} /> ⚖️ Compare Two Reports</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pick any two dates</div>
      </div>

      <div className="compare-selects">
        <select className="input-field" value={date1} onChange={e => setDate1(e.target.value)}>
          {sorted.map(d => <option key={d.date} value={d.date}>{d.date}</option>)}
        </select>
        <div className="compare-vs">VS</div>
        <select className="input-field" value={date2} onChange={e => setDate2(e.target.value)}>
          {sorted.map(d => <option key={d.date} value={d.date}>{d.date}</option>)}
        </select>
      </div>

      <div className="compare-table">
        <div className="compare-row compare-head">
          <div>Metric</div>
          <div>{date1}</div>
          <div>{date2}</div>
          <div>Change</div>
        </div>
        {metrics.map(m => {
          const raw1 = data1[m.key], raw2 = data2[m.key];
          const has = (v: any) => v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v));
          if (!has(raw1) && !has(raw2)) return null;
          const v1 = Number(raw1 || 0);
          const v2 = Number(raw2 || 0);
          const diff = v2 - v1;
          const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
          let diffColor = 'var(--text-muted)';
          if (Math.abs(diff) > 0.0001) {
            const improving = m.lowerIsBetter ? diff < 0 : diff > 0;
            diffColor = improving ? 'var(--success)' : 'var(--warning)';
          }
          return (
            <div key={m.key} className="compare-row">
              <div className="compare-label">{m.label}</div>
              <div>{v1.toFixed(1)}</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{v2.toFixed(1)}</div>
              <div style={{ fontWeight: 700, color: diffColor }}>{Math.abs(diff) > 0.0001 ? diffStr : '-'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── APP ─────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'report', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'daily', label: 'Calendar', Icon: CalendarCheck },
  { id: 'new-report', label: 'New Report', Icon: FileText },
  { id: 'progress', label: 'Progress', Icon: TrendingUp },
];
const TAB_TITLES: Record<string, [string, string]> = {
  report: ['Health Overview', 'Take control of your health today!'],
  daily: ['Gym Calendar', 'Track your daily gym attendance'],
  'new-report': ['New Report', 'Log your latest body composition metrics'],
  progress: ['Progress', 'Trends across your reports, plus side-by-side comparison'],
};
function App() {
  const [activeTab, setActiveTab] = useState('report');
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

  const [, setUserProfile] = useLocalStorage('userProfile', {});
  const [, setProgressData] = useLocalStorage('progressData', []);
  const [, setGymDates] = useLocalStorage<string[]>('gymDates', []);

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
        body: JSON.stringify(body)
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
        body: JSON.stringify({ password })
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
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next })
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
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.personalInfo) setUserProfile(data.personalInfo);
        if (data && data.progressData && data.progressData.length > 0) setProgressData(data.progressData);
        if (data && Array.isArray(data.gymDates) && data.gymDates.length > 0) setGymDates(data.gymDates);
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
  const currentTab = !isAdmin && activeTab === 'new-report' ? 'report' : activeTab;

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
