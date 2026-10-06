import { useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { NUMERIC_KEYS, type ReportRecord } from '../types';
import { parseReportText } from '../lib/importer';

const countMetrics = (r: ReportRecord) => NUMERIC_KEYS.filter(k => r[k] !== undefined).length;

/**
 * Import a scanner report: upload a CSV / JSON / text file, or paste the report text.
 * One report fills the form for review; several are imported in bulk after confirmation.
 */
export function ImportPanel({ onFillForm, onImportMany }: {
  onFillForm: (record: ReportRecord) => void;
  onImportMany: (records: ReportRecord[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [found, setFound] = useState<ReportRecord[] | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const parse = (source: string) => {
    setError('');
    const records = parseReportText(source);
    if (records.length === 0) {
      setFound(null);
      setError('No metrics recognised. Use labels such as "Weight 80.2", "Skeletal Muscle Mass 35.5", or a CSV with a header row.');
      return;
    }
    setFound(records);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 2_000_000) return setError('File is too large (max 2 MB).');
    if (/\.pdf$/i.test(file.name)) return setError('PDF files cannot be read directly. Open the PDF, copy its text, and paste it below.');
    const content = await file.text();
    setText(content.slice(0, 20000));
    parse(content);
    if (fileRef.current) fileRef.current.value = '';
  };

  const reset = () => { setFound(null); setText(''); setError(''); };

  return (
    <div className="import-panel">
      <button type="button" className="section-header" onClick={() => setOpen(o => !o)} style={{ borderRadius: open ? '14px 14px 0 0' : 14 }}>
        <span className="section-title"><Upload size={18} color="var(--accent)" /> Import from scanner report</span>
        <span className="import-hint">{open ? 'Hide' : 'CSV · JSON · text'}</span>
      </button>

      {open && (
        <div className="import-body">
          <p className="section-note">
            Upload a CSV / JSON / text export, or paste the text copied from your report (for a PDF, copy its text first).
            The importer matches labels like <em>Weight, Body Fat Mass, SMM, PBF, Visceral Fat Level, BMR, Body Age</em>.
          </p>

          <div className="flex gap-2 flex-wrap mb-2">
            <input ref={fileRef} type="file" accept=".csv,.json,.txt,text/csv,application/json,text/plain" hidden
              onChange={e => onFile(e.target.files?.[0])} />
            <button type="button" className="tab-btn" style={{ background: 'var(--panel-bg)' }} onClick={() => fileRef.current?.click()}>
              <FileText size={16} /> Choose file
            </button>
          </div>

          <textarea className="input-field import-textarea" rows={6} value={text}
            onChange={e => setText(e.target.value)}
            placeholder={'Or paste report text here, e.g.\nDate: 2026-10-05\nWeight 80.2 kg\nSkeletal Muscle Mass 35.5\nPercent Body Fat 21.4\nVisceral Fat Level 8'} />

          <div className="flex gap-2 mt-1 flex-wrap">
            <button type="button" className="submit-btn" style={{ width: 'auto', padding: '0.5rem 1.25rem' }} onClick={() => parse(text)} disabled={!text.trim()}>
              Read report
            </button>
            {(text || found) && <button type="button" className="tab-btn" onClick={reset}>Clear</button>}
          </div>

          {error && <p className="login-error">{error}</p>}

          {found && (
            <div className="import-result">
              {found.length === 1 ? (
                <>
                  <p><strong>Recognised {countMetrics(found[0])} metrics</strong> for <strong>{found[0].date}</strong>
                    {found[0].bodyType && <> · {found[0].bodyType}</>}.</p>
                  <p className="section-note">Fills the form below so you can check the values and the date before saving.</p>
                  <button type="button" className="submit-btn" style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
                    onClick={() => { onFillForm(found[0]); reset(); setOpen(false); }}>
                    Fill the form
                  </button>
                </>
              ) : (
                <>
                  <p><strong>Found {found.length} reports</strong> ({found[0].date} → {found[found.length - 1].date}).</p>
                  <p className="section-note">Reports with a date that already exists will be replaced.</p>
                  <button type="button" className="submit-btn" style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
                    onClick={() => { onImportMany(found); reset(); setOpen(false); }}>
                    Import {found.length} reports
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
