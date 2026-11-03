// All "day" logic uses Asia/Kolkata so deadlines match what Indian students see on their calendar.
const TZ = process.env.APP_TZ || 'Asia/Kolkata';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const todayISO = (d = new Date()) => fmt.format(d);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const toISODate = (v) => (v instanceof Date ? fmt.format(v) : String(v).slice(0, 10));
module.exports = { TZ, todayISO, addDays, daysBetween, toISODate };
