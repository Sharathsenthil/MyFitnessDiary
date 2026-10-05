import { useState, type FormEvent } from 'react';
import {
  Activity, Scale, Dumbbell, Flame, Target, User,
  LayoutDashboard, FileText, CalendarCheck, TrendingUp,
  PieChart as PieChartIcon, Droplets, ChevronDown, ChevronUp, Plus,
  Menu, Moon, Sun, GitCompare
} from 'lucide-react';
import { fitnessData } from './data';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend, LineChart, Line,
  XAxis, YAxis, CartesianGrid
} from 'recharts';
import './index.css';

/* ─── Hook ─────────────────────────────────────────── */
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const v = value instanceof Function ? value(storedValue) : value;
      setStoredValue(v);
      window.localStorage.setItem(key, JSON.stringify(v));
    } catch { /* noop */ }
  };
  return [storedValue, setValue] as const;
}

/* ─── Helpers ───────────────────────────────────────── */
function statusInfo(value: number, min?: number, max?: number, isHighBad = false) {
  if (!min || !max) return { label: '–', color: 'var(--text-muted)', badge: 'badge-neutral' };
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
      {(min && max) ? (
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
    gymJoinedDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(userProfile);
  const [chartFilter, setChartFilter] = useState<'last10' | 'all'>('all');

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile(profileForm);
    setIsEditingProfile(false);
    
    // Save to the MongoDB backend (Render or Local)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await fetch(`${apiUrl}/api/fitness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalInfo: profileForm })
      });
    } catch(err) {
      console.error('Failed to save to MongoDB backend:', err);
    }
  };

  const exportData = () => {
    if (progressData.length === 0) return alert("No data to export");
    const headers = Object.keys(progressData[0]).join(',');
    const rows = progressData.map((row: any) => Object.values(row).join(',')).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fitness_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayData = chartFilter === 'last10' ? progressData.slice(-10) : progressData;
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
              <div className="flex gap-2 mt-1">
                <button type="submit" className="submit-btn" style={{ padding: '0.4rem', fontSize: '0.9rem' }}>💾 Save</button>
                <button type="button" className="tab-btn" onClick={() => { setIsEditingProfile(false); setProfileForm(userProfile); }}>Cancel</button>
              </div>
            </form>
          ) : (
            <div>
              <h2 className="hero-id" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {userProfile.name}
                <button onClick={() => setIsEditingProfile(true)} className="tab-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>✏️ Edit</button>
              </h2>
              <p className="hero-sub">
                🎂 {Math.floor((new Date().getTime() - new Date(userProfile.dob).getTime()) / 31557600000)} yrs
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
        <table className="data-table">
          <thead>
            <tr><th>Metric</th><th>Value</th><th>Normal Range</th><th>Status</th></tr>
          </thead>
          <tbody>
            <MetricRow label="⚖️ Weight" value={bodyComponent.weight.value} unit="KG" min={bodyComponent.weight.min} max={bodyComponent.weight.max} isHighBad tooltip="Your total body weight." />
            <MetricRow label="📉 BMI" value={obesityAnalysis.bmi.value} unit="" min={obesityAnalysis.bmi.min} max={obesityAnalysis.bmi.max} isHighBad tooltip="Body Mass Index — weight relative to height." />
            <MetricRow label="📏 Waist-Hip Ratio" value={obesityAnalysis.whr.value} unit="" min={obesityAnalysis.whr.min} max={obesityAnalysis.whr.max} isHighBad tooltip="Ratio of waist to hip circumference." />
            <MetricRow label="🔥 BMR" value={obesityAnalysis.bmr.value} unit="Kcal" tooltip="Basal Metabolic Rate — calories burned at rest." />
            <MetricRow label="⚙️ Fat Free Mass" value={obesityAnalysis.ffm.value} unit="KG" tooltip="Everything in your body that isn't fat." />
          </tbody>
        </table>
      </Section>

      {/* ── 2. Body Composition ── */}
      <Section title="Body Composition" icon={<PieChartIcon size={18} color="var(--accent)" />}>
        <div className="two-col-layout">
          <table className="data-table">
            <thead>
              <tr><th>Component</th><th>Value</th><th>Normal Range</th><th>Status</th></tr>
            </thead>
            <tbody>
              <MetricRow label="💧 Water" value={bodyComponent.water.value} unit="KG" min={bodyComponent.water.min} max={bodyComponent.water.max} tooltip="Total body water." />
              <MetricRow label="🥩 Protein" value={bodyComponent.protein.value} unit="KG" min={bodyComponent.protein.min} max={bodyComponent.protein.max} tooltip="Total protein in your body." />
              <MetricRow label="🥓 Fat Mass" value={bodyComponent.fat.value} unit="KG" min={bodyComponent.fat.min} max={bodyComponent.fat.max} isHighBad tooltip="Total fat mass." />
              <MetricRow label="🧂 Inorganic Salt" value={bodyComponent.inorganicSalt.value} unit="KG" min={bodyComponent.inorganicSalt.min} max={bodyComponent.inorganicSalt.max} tooltip="Mineral/salt content in bones and cells." />
            </tbody>
          </table>
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bodyCompData} cx="50%" cy="50%" innerRadius={60} outerRadius={88} paddingAngle={4} dataKey="value" stroke="none">
                  {bodyCompData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: '#fff' }} />
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
          <table className="data-table">
            <thead>
              <tr><th>Metric</th><th>Value</th><th>Range</th><th>Status</th></tr>
            </thead>
            <tbody>
              <MetricRow label="Percent Body Fat" value={fatAnalysis.pbf.value} unit="%" min={fatAnalysis.pbf.min} max={fatAnalysis.pbf.max} isHighBad tooltip="PBF: % of total weight that is fat." />
              <MetricRow label="Trunk Fat Mass" value={fatAnalysis.trunkFatMass.value} unit="KG" min={fatAnalysis.trunkFatMass.min} max={fatAnalysis.trunkFatMass.max} isHighBad tooltip="Fat concentrated in the torso area." />
              <MetricRow label="Visceral Fat Index" value={fatAnalysis.visceralFatIndex.value} unit="" min={fatAnalysis.visceralFatIndex.min} max={fatAnalysis.visceralFatIndex.max} isHighBad tooltip="Dangerous fat surrounding internal organs." />
            </tbody>
          </table>
        </Section>

        {/* ── 4. Muscle Analysis ── */}
        <Section title="Muscle Analysis 💪" icon={<Dumbbell size={18} color="var(--success)" />}>
          <table className="data-table">
            <thead>
              <tr><th>Metric</th><th>Value</th><th>Range</th><th>Status</th></tr>
            </thead>
            <tbody>
              <MetricRow label="Muscle Mass" value={muscleAnalysis.muscle.value} unit="KG" min={muscleAnalysis.muscle.min} max={muscleAnalysis.muscle.max} tooltip="Total muscle in your body." />
              <MetricRow label="Skeletal Muscle (SMM)" value={muscleAnalysis.smm.value} unit="KG" min={muscleAnalysis.smm.min} max={muscleAnalysis.smm.max} tooltip="Muscle attached to bones — grows with exercise." />
              <MetricRow label="Protein Content" value={muscleAnalysis.protein.value} unit="KG" min={muscleAnalysis.protein.min} max={muscleAnalysis.protein.max} tooltip="Protein stored in muscle tissue." />
            </tbody>
          </table>
        </Section>

        {/* ── 5. Segmental Analysis ── */}
        <Section title="Segmental Analysis 🦵" icon={<Activity size={18} color="var(--accent)" />}>
          <table className="data-table">
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
          </table>
        </Section>

        {/* ── 6. Water & Edema ── */}
        <Section title="Hydration & Edema 💧" icon={<Droplets size={18} color="#00f2fe" />}>
          <table className="data-table">
            <thead>
              <tr><th>Metric</th><th>Value</th><th>Range</th><th>Status</th></tr>
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
          </table>
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

      {/* ── 8. Progress Chart ── */}
      <Section title="Progress Over Time" icon={<TrendingUp size={18} color="var(--accent)" />}>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex gap-2" style={{ background: 'rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '10px' }}>
            <button className={`tab-btn ${chartFilter === 'last10' ? 'active' : ''}`} onClick={() => setChartFilter('last10')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Last 10 Reports</button>
            <button className={`tab-btn ${chartFilter === 'all' ? 'active' : ''}`} onClick={() => setChartFilter('all')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>All Time</button>
          </div>
          <button className="tab-btn" onClick={exportData} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>📥 Export CSV</button>
        </div>

        {displayData.length > 0 ? (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: '#fff' }} 
                  itemSorter={(item) => {
                    const order = ['Weight (KG)', 'Muscle (KG)', 'Fat (KG)', 'SMM (KG)', 'PBF (%)'];
                    return order.indexOf(item.name as string);
                  }}
                />
                <Line type="monotone" dataKey="weight" stroke="#f43f5e" name="Weight (KG)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="muscle" stroke="#10b981" name="Muscle (KG)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="fat"    stroke="#f59e0b" name="Fat (KG)"    strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="smm"    stroke="#8b5cf6" name="SMM (KG)"    strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="pbf"    stroke="#3b82f6" name="PBF (%)"     strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No progress entries yet. Add one via <strong>New Report</strong> tab. 📝</p>
        )}

        {/* ── Custom chart legend with explanations ── */}
        <div className="chart-legend-grid">
          {[
            { color: '#f43f5e', label: 'Weight ⚖️', unit: 'KG', desc: 'Total body weight measured on the scale.' },
            { color: '#10b981', label: 'Muscle 💪', unit: 'KG', desc: 'Total muscle mass — all muscle tissue in the body.' },
            { color: '#f59e0b', label: 'Fat 🥓',    unit: 'KG', desc: 'Total fat mass — all stored fat in the body.' },
            { color: '#8b5cf6', label: 'SMM 🏋️',   unit: 'KG', desc: 'Skeletal Muscle Mass — muscle attached to bones that grows with exercise.' },
            { color: '#3b82f6', label: 'PBF 📊',    unit: '%',  desc: 'Percent Body Fat — fat as a percentage of total body weight. Lower is generally better.' },
          ].map(item => (
            <div key={item.label} className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: item.color }} />
              <div>
                <div className="chart-legend-label" style={{ color: item.color }}>
                  {item.label} <span className="metric-unit">{item.unit}</span>
                </div>
                <div className="chart-legend-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
}

/* ─── DAILY LOG TAB ──────────────────────────────────── */
function DailyLogTab() {
  const [gymDates, setGymDates] = useLocalStorage<string[]>('gymDates', []);
  const [userProfile] = useLocalStorage('userProfile', { gymJoinedDate: '2026-01-01' });
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = currentMonth.getDay();
  const yearStr = currentMonth.getFullYear();
  const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
  const daysAttended = gymDates.filter(d => d.startsWith(`${yearStr}-${monthStr}`)).length;

  const joinedDate = new Date(userProfile.gymJoinedDate || '2026-01-01');
  const totalDaysSinceJoined = Math.max(1, Math.floor((today.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const totalDaysAttended = gymDates.filter(d => new Date(d) >= joinedDate).length;
  const overallPct = Math.round((totalDaysAttended / totalDaysSinceJoined) * 100);

  const toggleDate = (dayStr: string) => {
    setGymDates(gymDates.includes(dayStr)
      ? gymDates.filter(d => d !== dayStr)
      : [...gymDates, dayStr]);
  };

  const days: React.ReactNode[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`e-${i}`} className="calendar-day empty" />);
  
  const joinD = new Date(userProfile.gymJoinedDate || '2026-01-01');
  joinD.setHours(0,0,0,0);
  const todayOnly = new Date();
  todayOnly.setHours(0,0,0,0);

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
    const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isGymDay = gymDates.includes(dayStr);
    const isToday = dayStr === today.toISOString().split('T')[0];
    const isInvalid = d < joinD || d > todayOnly;

    days.push(
      <div 
        key={i} 
        className={`calendar-day ${isGymDay ? 'gym-day' : ''} ${isToday ? 'today' : ''} ${isInvalid ? 'disabled' : ''}`} 
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
          
          <div style={{ flex: 1, minWidth: 200, borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '1.25rem' }}>
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
          Click any day to mark it as a gym day 🏋️
        </p>
      </div>
    </div>
  );
}

/* ─── NEW REPORT TAB ─────────────────────────────────── */
function NewReportTab() {
  const [progressData, setProgressData] = useLocalStorage('progressData', [
    {
      date: new Date().toISOString().split('T')[0],
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
    date: new Date().toISOString().split('T')[0],
    weight: '', fat: '', muscle: '', pbf: '', smm: '', bmr: '', whr: '', ffm: '', vfi: '', bmi: '',
    score: '', bodyAge: '', bodyType: '',
    protein: '', water: '', salt: '', trunkFat: '', bodyWaterPct: '', icw: '', ecw: '',
    raMuscle: '', laMuscle: '', tMuscle: '', rlMuscle: '', llMuscle: '',
    raFat: '', laFat: '', tFat: '', rlFat: '', llFat: ''
  };
  const [form, setForm] = useState<any>(blank);
  const [showSuccess, setShowSuccess] = useState(false);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newData: any = { ...form };
    Object.keys(newData).forEach(k => {
      if (k !== 'date' && k !== 'bodyType' && newData[k] !== '') newData[k] = Number(newData[k]);
    });
    const updatedData = [...progressData.filter((d: any) => d.date !== form.date), newData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setProgressData(updatedData);
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
              <input type="date" className="input-field" value={form.date} onChange={e => set('date', e.target.value)} required />
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
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
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
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── COMPARE TAB ────────────────────────────────────────── */
function CompareTab() {
  const [progressData] = useLocalStorage<any[]>('progressData', []);
  const [date1, setDate1] = useState(progressData.length > 1 ? progressData[progressData.length - 2].date : progressData[0]?.date || '');
  const [date2, setDate2] = useState(progressData.length > 0 ? progressData[progressData.length - 1].date : '');

  const data1 = progressData.find(d => d.date === date1) || progressData[0];
  const data2 = progressData.find(d => d.date === date2) || progressData[0];

  const metrics = [
    { label: 'Weight (kg)', key: 'weight' },
    { label: 'Skeletal Muscle (kg)', key: 'smm' },
    { label: 'Body Fat Mass (kg)', key: 'fat' },
    { label: 'Percent Body Fat (%)', key: 'pbf' },
    { label: 'BMI', key: 'bmi' },
    { label: 'Visceral Fat Index', key: 'vfi' },
    { label: 'InBody Score', key: 'score' },
    { label: 'Fat Free Mass (kg)', key: 'ffm' },
    { label: 'Total Body Water (L)', key: 'water' },
    { label: 'Protein (kg)', key: 'protein' },
    { label: 'Inorganic Salt (kg)', key: 'salt' },
  ];

  if (progressData.length < 2) {
    return (
      <div className="tab-content fade-in">
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Activity size={48} style={{ margin: '0 auto 1rem', color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Not Enough Data</h2>
          <p style={{ color: 'var(--text-muted)' }}>You need at least two logged reports to compare them. Go to "New Report" to log another entry!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content fade-in">
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title"><GitCompare size={18} /> ⚖️ Compare Reports</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Analyze your progress over time</div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <select className="input-field" value={date1} onChange={e => setDate1(e.target.value)} style={{ flex: 1, cursor: 'pointer' }}>
            {progressData.map(d => <option key={d.date} value={d.date}>{d.date}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontWeight: 700 }}>VS</div>
          <select className="input-field" value={date2} onChange={e => setDate2(e.target.value)} style={{ flex: 1, cursor: 'pointer' }}>
            {progressData.map(d => <option key={d.date} value={d.date}>{d.date}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            <div>Metric</div>
            <div style={{ textAlign: 'right' }}>{date1}</div>
            <div style={{ textAlign: 'right' }}>{date2}</div>
            <div style={{ textAlign: 'right' }}>Difference</div>
          </div>
          {metrics.map(m => {
            const v1 = Number(data1[m.key] || 0);
            const v2 = Number(data2[m.key] || 0);
            const diff = v2 - v1;
            const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
            let diffColor = 'var(--text-muted)';
            if (diff !== 0) {
              if (['fat', 'pbf', 'bmi', 'vfi'].includes(m.key)) {
                diffColor = diff < 0 ? 'var(--success)' : 'var(--warning)';
              } else {
                diffColor = diff > 0 ? 'var(--success)' : 'var(--warning)';
              }
            }

            return (
              <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--card-border)', alignItems: 'center' }}>
                <div style={{ fontWeight: 500 }}>{m.label}</div>
                <div style={{ textAlign: 'right' }}>{v1.toFixed(1)}</div>
                <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>{v2.toFixed(1)}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, color: diffColor }}>
                  {diff !== 0 ? diffStr : '-'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── APP ─────────────────────────────────────────────── */
function App() {
  const [activeTab, setActiveTab] = useState('report');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useLocalStorage('darkMode', false);

  return (
    <div className={`app-window ${isDarkMode ? 'dark' : ''}`}>
      <div className={`sidebar ${isSidebarOpen ? '' : 'closed'}`}>
        <div style={{ padding: '0.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: isSidebarOpen ? 'space-between' : 'center', flexDirection: isSidebarOpen ? 'row' : 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--accent)', color: 'var(--accent-text)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>⚡</div>
            {isSidebarOpen && <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700, color: 'white' }}>Fitness Diary</h1>}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}>
            <Menu size={22} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>
            <LayoutDashboard size={20} style={{ flexShrink: 0 }} /> {isSidebarOpen && <span>Dashboard</span>}
          </button>
          <button className={`nav-item ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>
            <CalendarCheck size={20} style={{ flexShrink: 0 }} /> {isSidebarOpen && <span>Gym Calendar</span>}
          </button>
          <button className={`nav-item ${activeTab === 'new-report' ? 'active' : ''}`} onClick={() => setActiveTab('new-report')}>
            <FileText size={20} style={{ flexShrink: 0 }} /> {isSidebarOpen && <span>New Report</span>}
          </button>
          <button className={`nav-item ${activeTab === 'compare' ? 'active' : ''}`} onClick={() => setActiveTab('compare')}>
            <GitCompare size={20} style={{ flexShrink: 0 }} /> {isSidebarOpen && <span>Compare</span>}
          </button>
        </nav>
      </div>

      <div className="main-content">
        <header style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.2rem 0' }}>
                {activeTab === 'report' ? 'Health Overview' : activeTab === 'daily' ? 'Gym Calendar' : activeTab === 'compare' ? 'Compare Reports' : 'New Report'}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
                {activeTab === 'report' ? 'Take control of your health today!' : activeTab === 'daily' ? 'Track your daily gym attendance' : activeTab === 'compare' ? 'Detailed side-by-side analysis' : 'Log your latest body composition metrics'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div 
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{ width: 44, height: 44, background: 'var(--card-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', color: 'var(--text-main)', cursor: 'pointer', border: '1px solid var(--card-border)' }}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </div>
          </div>
        </header>
        
        <div className="tab-wrapper">
          {activeTab === 'report' && <ReportTab />}
          {activeTab === 'daily' && <DailyLogTab />}
          {activeTab === 'new-report' && <NewReportTab />}
          {activeTab === 'compare' && <CompareTab />}
        </div>
      </div>
    </div>
  );
}

export default App;
