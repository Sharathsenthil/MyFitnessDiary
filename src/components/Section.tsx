import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/** Card with a collapsible body. */
export function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: ReactNode; children: ReactNode; defaultOpen?: boolean;
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
