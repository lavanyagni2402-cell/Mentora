const TZ = 'Asia/Kolkata';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const todayISO = () => dayFmt.format(new Date());
export const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
export const fmtDate = (iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });
export const fmtDateTime = (ts) => new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ });
export const fmtMin = (m) => { m = Math.round(m || 0); if (m < 60) return `${m}m`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h}h ${r}m` : `${h}h`; };
export const fmtHour = (h) => (h == null ? '—' : new Date(2000, 0, 1, h).toLocaleTimeString('en-IN', { hour: 'numeric' }));
export const subColor = (i) => `var(--sub-${(i ?? 0) % 7})`;
export const PRIORITY = { high: 'High', medium: 'Medium', low: 'Low' };

export function dueInfo(task) {
  if (!task.dueDate) return { text: 'No date', tone: '' };
  if (task.status === 'done') return { text: fmtDate(task.dueDate), tone: '' };
  const d = daysBetween(todayISO(), task.dueDate);
  if (d < 0) return { text: `Overdue · ${-d}d`, tone: 'text-danger font-bold' };
  if (d === 0) return { text: 'Due today', tone: 'text-accent-strong font-bold' };
  if (d === 1) return { text: 'Tomorrow', tone: 'text-warn font-semibold' };
  if (d < 7) return { text: `In ${d} days`, tone: d <= 3 ? 'text-warn font-semibold' : '' };
  return { text: fmtDate(task.dueDate), tone: '' };
}
export const greeting = () => { const h = Number(new Date().toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: TZ })); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
