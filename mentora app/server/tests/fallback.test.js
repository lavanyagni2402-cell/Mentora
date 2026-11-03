// If the ML service is down, recommendations still work with a rule-based score.
process.env.NODE_ENV = 'test';
process.env.ML_URL = 'http://127.0.0.1:9';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ml = require('../src/services/ml');

test('falls back to rule-based scoring when the ML service is unreachable', async () => {
  const base = { difficulty: 3, est_remaining_minutes: 60, subject_minutes_7d: 60, user_ontime_rate: 0.7, pending_count: 4 };
  const out = await ml.score([{ ...base, id: 'urgent', days_left: 0, priority_level: 2 }, { ...base, id: 'later', days_left: 12, priority_level: 0 }]);
  assert.equal(out.fallback, true);
  const s = Object.fromEntries(out.results.map((r) => [r.id, r.score]));
  assert.ok(s.urgent > s.later);
});
