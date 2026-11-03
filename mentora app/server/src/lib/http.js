// Small helpers for errors and input checks
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (msg) => { throw new HttpError(400, msg); };

const check = {
  text(v, label, min = 1, max = 200) {
    if (typeof v !== 'string' || v.trim().length < min) bad(`${label} is required`);
    if (v.trim().length > max) bad(`${label} is too long`);
    return v.trim();
  },
  int(v, label, min, max, def) {
    if (v === undefined || v === '' || v === null) { if (def !== undefined) return def; bad(`${label} is required`); }
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) bad(`${label} must be between ${min} and ${max}`);
    return n;
  },
  oneOf(v, label, options, def) {
    if (v === undefined && def !== undefined) return def;
    if (!options.includes(v)) bad(`${label} is not valid`);
    return v;
  },
  date(v) {
    if (!v) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) bad('Use a valid date');
    return v;
  },
  id(v) { if (!/^[0-9a-f-]{36}$/i.test(String(v))) throw new HttpError(404, 'Not found.'); return v; },
};

module.exports = { HttpError, asyncH, check };
