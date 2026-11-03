// Calls the Python ML service. If it's down, a rule-based score keeps recommendations working.
const config = require('../config');

async function call(path, body, timeout = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(config.mlUrl + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`ML service returned ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// Same ranking formula as the ML service, with a hand-made risk estimate
const PRIORITY = [0.3, 0.6, 1.0];
function fallbackScore(tasks) {
  return tasks.map((f) => {
    const urgency = f.days_left < 0 ? 1 : Math.max(0, 1 - f.days_left / 14);
    const z = -2.2 + 2.6 * Math.max(0, 1 - f.days_left / 10) + 0.9 * Math.min(1, f.est_remaining_minutes / 240)
      + 0.35 * (f.difficulty - 3) + 0.8 * (1 - Math.min(1, f.subject_minutes_7d / 120)) - 2 * (f.user_ontime_rate - 0.7);
    const risk = 1 / (1 + Math.exp(-z));
    return { id: f.id, risk, score: 0.55 * risk + 0.25 * PRIORITY[f.priority_level] + 0.2 * urgency, contributions: {} };
  });
}

async function score(tasks) {
  if (!tasks.length) return { results: [], model_version: 'none' };
  try { return await call('/score', { tasks }); } catch { return { results: fallbackScore(tasks), model_version: 'rules-fallback', fallback: true }; }
}

module.exports = {
  score,
  fallbackScore,
  modelInfo: () => call('/model'),
  train: (rows) => call('/train', { rows }, 120000),
  segments: (users) => call('/segments', { users }, 20000),
};
