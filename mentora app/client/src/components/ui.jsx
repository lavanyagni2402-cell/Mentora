import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { subColor, PRIORITY } from '../lib/format';

export function PageHead({ eyebrow, title, sub, children }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-[clamp(1.6rem,1.2rem+1.4vw,2.2rem)] leading-tight">{title}</h1>
        {sub && <p className="mt-1.5 text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`card min-w-0 ${className}`}>
      {(title || action) && (
        <div className="mb-3.5 flex items-center justify-between gap-3">
          {typeof title === 'string' ? <h2 className="text-lg">{title}</h2> : title}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, note, tone }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="eyebrow">{label}</div>
      <div className={`mt-1.5 font-display text-3xl font-bold leading-tight num ${tone === 'alert' ? 'text-danger' : ''}`}>{value}</div>
      {note && <div className={`mt-1 text-sm ${tone === 'good' ? 'text-ok' : 'text-muted'}`}>{note}</div>}
    </div>
  );
}

export const SubjectChip = ({ subject, className = '' }) => (
  <span className={`chip-dot ${className}`}><span className="h-2 w-2 rounded-full" style={{ background: subColor(subject?.color) }} />{subject?.name ?? 'No subject'}</span>
);

const PRIO_CLS = { high: 'bg-danger-soft text-danger', medium: 'bg-warn-soft text-warn', low: 'bg-surface2 text-muted' };
export const Priority = ({ value }) => (
  <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide whitespace-nowrap ${PRIO_CLS[value]}`}>{PRIORITY[value]}</span>
);

export const Empty = ({ children, action }) => (
  <div className="flex flex-col items-center gap-3 px-4 py-8 text-center text-muted">{children}{action}</div>
);

export const Spinner = ({ label = 'Loading' }) => (
  <div className="flex items-center gap-2 py-10 justify-center text-muted">{label}…</div>
);

export function Modal({ title, onClose, children, width = 'max-w-lg' }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector('input:not([type=radio]),select,textarea')?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`w-full ${width} max-h-[calc(100dvh-32px)] overflow-auto rounded-2xl bg-surface p-6 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl">{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, error }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="label">{label}{hint && <em className="not-italic font-normal"> {hint}</em>}</span>
      {children}
      {error && <span className="text-sm text-danger">{error}</span>}
    </label>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-[10px] bg-surface2 p-[3px]">
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${value === v ? 'bg-surface text-ink shadow' : 'text-muted hover:text-ink'}`}>{l}</button>
      ))}
    </div>
  );
}

// Two-click confirmation (no browser confirm dialogs)
export function ConfirmButton({ children, confirmText = 'Click again to confirm', onConfirm, className = 'btn-danger btn-sm' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t); }, [armed]);
  return <button type="button" className={`${className} ${armed ? '!bg-danger !text-surface !border-danger' : ''}`} onClick={() => (armed ? onConfirm() : setArmed(true))}>{armed ? confirmText : children}</button>;
}

export const ErrorNote = ({ children }) => children ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{children}</p> : null;
