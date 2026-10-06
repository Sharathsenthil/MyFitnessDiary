import { useState, type FormEvent } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Plus, TrendingUp } from 'lucide-react';
import { NUMERIC_KEYS, type NumericKey, type ReportForm, type ReportRecord } from '../types';
import { useLocalStorage } from '../lib/storage';
import { parseDateStr, toDateStr } from '../lib/dates';
import { useAuth } from '../lib/auth';
import { cleanRecord, upsertRecords } from '../lib/records';
import { FormField } from '../components/FormField';
import { ImportPanel } from '../components/ImportPanel';

export function NewReportTab() {
  const { save } = useAuth();
  const [progressData, setProgressData] = useLocalStorage<ReportRecord[]>('progressData', []);

  const makeBlank = (): ReportForm => ({
    date: toDateStr(new Date()),
    bodyType: '',
    ...(Object.fromEntries(NUMERIC_KEYS.map(k => [k, ''])) as Record<NumericKey, string>),
  });
  const [form, setForm] = useState<ReportForm>(makeBlank);
  const [showSuccess, setShowSuccess] = useState<string>('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const flash = (msg: string) => {
    setShowSuccess(msg);
    setTimeout(() => setShowSuccess(''), 3500);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Blank fields are left out of the record instead of being stored as ''
    const record = cleanRecord({ ...form }) as ReportRecord;
    const updatedData = upsertRecords(progressData, [record]);
    setProgressData(updatedData);
    await save({ progressData: updatedData });
    setForm(makeBlank());
    flash('✅ Report saved successfully!');
  };

  const toForm = (record: ReportRecord): ReportForm => {
    const f = makeBlank();
    f.date = record.date;
    f.bodyType = record.bodyType ?? '';
    for (const k of NUMERIC_KEYS) if (record[k] !== undefined) f[k] = String(record[k]);
    return f;
  };

  const handleEdit = (record: ReportRecord) => {
    setForm(toForm(record));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportOne = (record: ReportRecord) => {
    setForm(toForm(record));
    flash('📥 Report imported into the form - check the values and press Save.');
  };

  const handleImportMany = async (records: ReportRecord[]) => {
    const updatedData = upsertRecords(progressData, records);
    setProgressData(updatedData);
    await save({ progressData: updatedData });
    flash(`✅ Imported ${records.length} reports.`);
  };

  return (
    <div className="tab-content fade-in">
      <div style={{ width: '100%', margin: '0 auto' }}>
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title"><Plus size={18} /> 📋 Log Fitness Report</div>
          </div>

          {showSuccess && (
            <div className="success-banner">{showSuccess}</div>
          )}

          <ImportPanel onFillForm={handleImportOne} onImportMany={handleImportMany} />

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
                  {[...progressData].reverse().map(r => (
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

