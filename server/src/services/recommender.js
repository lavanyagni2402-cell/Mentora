const { query } = require('../db/pool');
const ml = require('./ml');
const { pendingTaskFeatures } = require('./features');

// Turns the model's biggest feature contributions into reasons a student can read
function reasonsFor(task, f, contributions = {}) {
  const out = [];
  if (f.days_left < 0) out.push(`Overdue by ${-f.days_left} day${f.days_left === -1 ? '' : 's'}`);
  else if (f.days_left === 0) out.push('Due today');
  else if (f.days_left <= 3) out.push(`Due in ${f.days_left} day${f.days_left === 1 ? '' : 's'}`);
  if (task.priority === 'high') out.push('High priority');
  if (contributions.subject_minutes_7d > 0 && f.subject_minutes_7d < 90)
    out.push(f.subject_minutes_7d ? `Only ${f.subject_minutes_7d} min on ${task.subject_name} this week` : `No study time on ${task.subject_name} this week`);
  if (contributions.difficulty > 0 && f.difficulty >= 4) out.push(`You rated ${task.subject_name} ${f.difficulty}/5 difficulty`);
  if (contributions.est_remaining_minutes > 0 && f.est_remaining_minutes >= 90) out.push(`About ${Math.round(f.est_remaining_minutes / 6) / 10}h of work left`);
  return out.slice(0, 4);
}

async function recommend(userId, limit = 5) {
  const { tasks, features } = await pendingTaskFeatures(userId);
  if (!tasks.length) return { items: [], modelVersion: 'none' };
  const out = await ml.score(features);
  const byId = Object.fromEntries(out.results.map((r) => [r.id, r]));
  const ranked = tasks.map((t, i) => ({ t, f: features[i], r: byId[t.id] })).sort((a, b) => b.r.score - a.r.score).slice(0, limit);

  // keep the latest suggestions in the RECOMMENDATION table (ER diagram)
  await query('DELETE FROM recommendations WHERE user_id=$1', [userId]);
  const items = [];
  for (const { t, f, r } of ranked) {
    const reasons = reasonsFor(t, f, r.contributions);
    await query('INSERT INTO recommendations (user_id, task_id, subject_id, recommendation_text, score, risk, reasons) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [userId, t.id, t.subject_id, `Study "${t.title}" next`, r.score, r.risk, JSON.stringify(reasons)]);
    items.push({ taskId: t.id, title: t.title, subjectId: t.subject_id, subjectName: t.subject_name, color: t.color, priority: t.priority, risk: r.risk, score: r.score, reasons });
  }
  return { items, modelVersion: out.model_version, fallback: !!out.fallback };
}

module.exports = { recommend };
