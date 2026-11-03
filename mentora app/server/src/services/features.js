// Turns a student's tasks + study history into the feature vectors the ML model uses.
const { many, one } = require('../db/pool');
const { todayISO, addDays, daysBetween, toISODate } = require('../lib/dates');

const PRIORITY_LEVEL = { low: 0, medium: 1, high: 2 };

async function userOnTimeRate(userId) {
  const r = await one(
    `SELECT COUNT(*)::int AS n,
            COUNT(*) FILTER (WHERE (completed_at AT TIME ZONE 'Asia/Kolkata')::date <= due_date)::int AS ontime
     FROM tasks WHERE user_id=$1 AND status='done' AND due_date IS NOT NULL`, [userId]);
  // Bayesian smoothing toward 70% so new users aren't judged on 1-2 tasks
  return (r.ontime + 3.5) / (r.n + 5);
}

async function pendingTaskFeatures(userId) {
  const today = todayISO();
  const tasks = await many(
    `SELECT t.*, s.name AS subject_name, s.difficulty, s.color,
       COALESCE((SELECT SUM(duration_minutes) FROM study_sessions ss WHERE ss.task_id = t.id),0)::int AS spent
     FROM tasks t JOIN subjects s ON s.id = t.subject_id
     WHERE t.user_id=$1 AND t.status='pending'`, [userId]);
  if (!tasks.length) return { tasks: [], features: [] };
  const subjMins = Object.fromEntries((await many(
    `SELECT subject_id, SUM(duration_minutes)::int AS m FROM study_sessions
     WHERE user_id=$1 AND started_at >= now() - interval '7 days' GROUP BY subject_id`, [userId])).map((r) => [r.subject_id, r.m]));
  const ontime = await userOnTimeRate(userId);
  const features = tasks.map((t) => ({
    id: t.id,
    subject_id: t.subject_id,
    days_left: t.due_date ? daysBetween(today, toISODate(t.due_date)) : 21,
    priority_level: PRIORITY_LEVEL[t.priority],
    difficulty: t.difficulty,
    est_remaining_minutes: Math.max(10, t.estimated_minutes - t.spent),
    subject_minutes_7d: subjMins[t.subject_id] || 0,
    user_ontime_rate: Number(ontime.toFixed(3)),
    pending_count: tasks.length,
    task_age_days: daysBetween(toISODate(t.created_at), today),
  }));
  return { tasks, features };
}

// Historical, labelled examples from the central database for retraining.
// Label: 1 = deadline missed (finished late, or still pending after the due date).
async function trainingRows() {
  const today = todayISO();
  return many(
    `WITH ot AS (
       SELECT user_id, (COUNT(*) FILTER (WHERE (completed_at AT TIME ZONE 'Asia/Kolkata')::date <= due_date) + 3.5) / (COUNT(*) + 5.0) AS rate
       FROM tasks WHERE status='done' AND due_date IS NOT NULL GROUP BY user_id)
     SELECT
       GREATEST(-3, t.due_date - (t.created_at AT TIME ZONE 'Asia/Kolkata')::date) AS days_left,
       CASE t.priority WHEN 'low' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END AS priority_level,
       s.difficulty,
       t.estimated_minutes AS est_remaining_minutes,
       COALESCE((SELECT SUM(duration_minutes) FROM study_sessions ss WHERE ss.subject_id=t.subject_id
                 AND ss.started_at BETWEEN t.created_at - interval '7 days' AND t.created_at),0) AS subject_minutes_7d,
       COALESCE(ot.rate, 0.7) AS user_ontime_rate,
       (SELECT COUNT(*) FROM tasks t2 WHERE t2.user_id=t.user_id AND t2.created_at <= t.created_at
          AND (t2.completed_at IS NULL OR t2.completed_at > t.created_at)) AS pending_count,
       0 AS task_age_days,
       CASE WHEN t.status='done' AND (t.completed_at AT TIME ZONE 'Asia/Kolkata')::date > t.due_date THEN 1
            WHEN t.status='pending' AND t.due_date < $1::date THEN 1 ELSE 0 END AS missed
     FROM tasks t JOIN subjects s ON s.id=t.subject_id LEFT JOIN ot ON ot.user_id=t.user_id
     WHERE t.due_date IS NOT NULL AND (t.status='done' OR t.due_date < $1::date)`, [today]);
}

// Per-student behaviour features for learner segmentation (admin analytics)
async function learnerFeatures() {
  return many(
    `SELECT u.id,
       COALESCE((SELECT SUM(duration_minutes) FROM study_sessions s WHERE s.user_id=u.id AND s.started_at >= now()-interval '28 days'),0)/4.0 AS weekly_minutes,
       COALESCE((SELECT COUNT(*) FROM study_sessions s WHERE s.user_id=u.id AND s.started_at >= now()-interval '28 days'),0)/4.0 AS sessions_per_week,
       COALESCE((SELECT AVG(duration_minutes) FROM study_sessions s WHERE s.user_id=u.id),0) AS avg_session_minutes,
       (SELECT (COUNT(*) FILTER (WHERE (completed_at AT TIME ZONE 'Asia/Kolkata')::date <= due_date) + 3.5) / (COUNT(*) + 5.0)
          FROM tasks t WHERE t.user_id=u.id AND t.status='done' AND t.due_date IS NOT NULL) AS ontime_rate
     FROM users u WHERE u.role='student' AND u.is_active`);
}

module.exports = { pendingTaskFeatures, trainingRows, learnerFeatures, PRIORITY_LEVEL };
