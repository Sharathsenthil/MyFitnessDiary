import type { NumericKey, ReportForm } from '../types';

export function FormField({ label, fieldKey, form, set, step = '0.1', required = false, tooltip = '' }: {
  label: string;
  fieldKey: NumericKey;
  form: ReportForm;
  set: (key: string, value: string) => void;
  step?: string;
  required?: boolean;
  tooltip?: string;
}) {
  return (
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
        value={form[fieldKey] ?? ''}
        onChange={e => set(fieldKey, e.target.value)}
        required={required}
        placeholder="Enter value…"
      />
    </div>
  );
}
