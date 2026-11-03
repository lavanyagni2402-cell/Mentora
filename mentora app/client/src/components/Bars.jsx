// Simple bar chart of study minutes per day, drawn with plain divs
import { fmtMin, fmtDate, todayISO } from '../lib/format';

export default function Bars({ data, height = 180, labels = 'weekday' }) {
  const max = Math.max(60, ...data.map((d) => d.minutes));
  const today = todayISO();
  return (
    <div className="flex items-end gap-1.5" style={{ height }} role="img" aria-label="Study minutes per day">
      {data.map((d, i) => (
        <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${fmtDate(d.date)}: ${fmtMin(d.minutes)}`}>
          {labels === 'weekday' && d.minutes > 0 && <span className="text-[10px] font-semibold num">{fmtMin(d.minutes)}</span>}
          <div className="w-full max-w-[38px] rounded-t-md bg-accent" style={{ height: `${(d.minutes / max) * (height - 40)}px`, opacity: d.date === today ? 1 : 0.45 }} />
          <span className="text-[10px] text-muted">
            {labels === 'weekday' ? fmtDate(d.date, { weekday: 'short' }) : i % 5 === 4 ? fmtDate(d.date, { day: 'numeric', month: 'short' }) : ' '}
          </span>
        </div>
      ))}
    </div>
  );
}
