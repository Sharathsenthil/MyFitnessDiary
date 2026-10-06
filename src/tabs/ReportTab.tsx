import { useState } from 'react';
import {
  Activity, Scale, Dumbbell, Flame, Target, User,
  PieChart as PieChartIcon, Droplets, Pencil,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { fitnessData } from '../data';
import type { ReportRecord, UserProfile } from '../types';
import { useLocalStorage } from '../lib/storage';
import { toDateStr, parseDateStr } from '../lib/dates';
import { useAuth } from '../lib/auth';
import { Section } from '../components/Section';
import { MetricRow } from '../components/MetricRow';

export function ReportTab() {
  const { isAdmin, save } = useAuth();
  const [progressData] = useLocalStorage<ReportRecord[]>('progressData', []);
  const latestData: Partial<ReportRecord> = progressData.length > 0 ? progressData[progressData.length - 1] : {};

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

  const [userProfile, setUserProfile] = useLocalStorage<UserProfile>('userProfile', {
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

  const latestReport: Partial<ReportRecord> = progressData[progressData.length - 1] || {};
  const currentScore = latestReport.score ?? personalInfo.score;
  const currentBodyAge = latestReport.bodyAge ?? personalInfo.bodyAge;
  const currentBodyType = latestReport.bodyType ?? fitnessData.bodyType;

  return (
    <div className="tab-content fade-in">

      {/* ── Profile Hero ── */}
      <div className={`hero-card mb-6 ${isAdmin && !isEditingProfile ? 'has-edit' : ''}`}>
        {isAdmin && !isEditingProfile && (
          <button className="hero-edit" onClick={() => { setProfileForm(userProfile); setIsEditingProfile(true); }} aria-label="Edit profile">
            <Pencil size={14} /> Edit
          </button>
        )}
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
              <div className="profile-actions">
                <button type="submit" className="submit-btn" style={{ padding: '0.5rem', fontSize: '0.9rem' }}>💾 Save</button>
                <button type="button" className="tab-btn profile-cancel" onClick={() => { setIsEditingProfile(false); setProfileForm(userProfile); }}>Cancel</button>
              </div>
            </form>
          ) : (
            <div>
              <h2 className="hero-id">{userProfile.name}</h2>
              <div className="hero-sub">
                <span className="hero-chip">🎂 {Math.floor((new Date().getTime() - parseDateStr(userProfile.dob).getTime()) / 31557600000)} yrs</span>
                <span className="hero-chip">📏 {userProfile.height} cm</span>
                <span className="hero-chip">🏋️ Joined {userProfile.gymJoinedDate}</span>
              </div>
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
                <span className={`badge ${String(currentBodyType).toLowerCase().includes('obese') ? 'badge-warning' : 'badge-success'}`}>
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
              <MetricRow label="Skeletal Muscle" value={muscleAnalysis.smm.value} unit="KG" min={muscleAnalysis.smm.min} max={muscleAnalysis.smm.max} tooltip="SMM: muscle attached to bones — grows with exercise." />
              <MetricRow label="Protein Content" value={muscleAnalysis.protein.value} unit="KG" min={muscleAnalysis.protein.min} max={muscleAnalysis.protein.max} tooltip="Protein stored in muscle tissue." />
            </tbody>
          </table></div>
        </Section>

        {/* ── 5. Segmental Analysis ── */}
        <Section title="Segmental Analysis 🦵 (KG)" icon={<Activity size={18} color="var(--accent)" />}>
          <div className="table-scroll"><table className="data-table">
            <thead>
              <tr><th>Segment</th><th>💪 Muscle</th><th>🥓 Fat</th></tr>
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
        <div className="goal-wrap">
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
          <div className="goal-stats">
            <div>
              <div className="goal-stat-label">⚖️ Weight to Lose</div>
              <div className="goal-stat-value" style={{ color: 'var(--warning)' }}>{weightManagement.weightControl} KG</div>
            </div>
            <div>
              <div className="goal-stat-label">🥓 Fat to Reduce</div>
              <div className="goal-stat-value" style={{ color: 'var(--warning)' }}>{weightManagement.fatControl} KG</div>
            </div>
            <div>
              <div className="goal-stat-label">💪 Muscle to Gain</div>
              <div className="goal-stat-value" style={{ color: 'var(--success)' }}>+{weightManagement.muscleControl} KG</div>
            </div>
          </div>
        </div>
      </Section>

    </div>
  );
}

