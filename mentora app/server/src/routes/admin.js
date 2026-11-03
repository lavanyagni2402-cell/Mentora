// Admin console: statistics, users, feedback inbox, AI model
const express = require('express');
const { one, many, query } = require('../db/pool');
const { asyncH, check, HttpError } = require('../lib/http');
const ml = require('../services/ml');
const { trainingRows, learnerFeatures } = require('../services/features');

const router = express.Router();

router.get('/stats', asyncH(async (req, res) => {
  const s = await one(`SELECT
      (SELECT COUNT(*) FROM users WHERE role='student')::int AS students,
      (SELECT COUNT(DISTINCT user_id) FROM study_sessions WHERE started_at >= now()-interval '7 days')::int AS active_week,
      (SELECT COUNT(*) FROM tasks)::int AS tasks,
      (SELECT COUNT(*) FROM tasks WHERE status='done')::int AS tasks_done,
      (SELECT COUNT(*) FROM study_sessions)::int AS sessions,
      (SELECT COALESCE(SUM(duration_minutes),0) FROM study_sessions)::int AS minutes,
      (SELECT COUNT(*) FROM feedback)::int AS feedback,
      (SELECT COUNT(*) FROM feedback WHERE status='new')::int AS feedback_open,
      (SELECT COALESCE(AVG(rating),0) FROM feedback)::float AS rating`);
  res.json(s);
}));

router.get('/users', asyncH(async (req, res) => {
  const q = `%${String(req.query.q || '').toLowerCase()}%`;
  const rows = await many(
    `SELECT u.id, u.name, u.email, u.role, u.is_active, u.is_demo, u.last_login_at,
       (SELECT COUNT(*) FROM tasks t WHERE t.user_id=u.id)::int AS tasks,
       (SELECT COALESCE(SUM(duration_minutes),0) FROM study_sessions s WHERE s.user_id=u.id)::int AS minutes
     FROM users u WHERE lower(u.name) LIKE $1 OR lower(u.email) LIKE $1 ORDER BY u.role, u.created_at DESC LIMIT 100`, [q]);
  res.json(rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.is_active, isDemo: u.is_demo, lastLoginAt: u.last_login_at, tasks: u.tasks, minutes: u.minutes })));
}));
router.patch('/users/:id', asyncH(async (req, res) => {
  check.id(req.params.id);
  if (req.params.id === req.user.id) throw new HttpError(400, "You can't disable your own account.");
  const u = await one('UPDATE users SET is_active=$2 WHERE id=$1 RETURNING id, is_active', [req.params.id, !!req.body.isActive]);
  if (!u) throw new HttpError(404, 'User not found.');
  res.json(u);
}));
router.delete('/users/:id', asyncH(async (req, res) => {
  check.id(req.params.id);
  if (req.params.id === req.user.id) throw new HttpError(400, "You can't delete your own account.");
  await query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.status(204).end();
}));

router.get('/feedback', asyncH(async (req, res) => {
  const rows = await many('SELECT f.*, u.name, u.email FROM feedback f LEFT JOIN users u ON u.id=f.user_id ORDER BY f.status, f.created_at DESC LIMIT 200');
  res.json(rows.map((f) => ({ id: f.id, category: f.category, rating: f.rating, message: f.message, status: f.status, adminReply: f.admin_reply, createdAt: f.created_at, user: f.email ? { name: f.name, email: f.email } : null })));
}));
router.patch('/feedback/:id', asyncH(async (req, res) => {
  check.id(req.params.id);
  const reply = req.body.adminReply ? check.text(req.body.adminReply, 'Reply', 1, 2000) : null;
  const f = await one(`UPDATE feedback SET admin_reply=COALESCE($2, admin_reply), status='resolved' WHERE id=$1 RETURNING id`, [req.params.id, reply]);
  if (!f) throw new HttpError(404, 'Feedback not found.');
  res.json(f);
}));

router.get('/ml', asyncH(async (req, res) => {
  try { res.json({ online: true, model: await ml.modelInfo() }); } catch { res.json({ online: false }); }
}));
router.post('/ml/retrain', asyncH(async (req, res) => {
  const rows = (await trainingRows()).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])));
  try { res.json(await ml.train(rows)); } catch { throw new HttpError(503, 'The ML service is not reachable. Start it and try again.'); }
}));
router.get('/ml/segments', asyncH(async (req, res) => {
  const users = (await learnerFeatures()).filter((u) => Number(u.sessions_per_week) > 0).map((u) => ({
    id: u.id, weekly_minutes: Number(u.weekly_minutes), sessions_per_week: Number(u.sessions_per_week),
    avg_session_minutes: Number(u.avg_session_minutes), ontime_rate: u.ontime_rate == null ? 0.7 : Number(u.ontime_rate),
  }));
  try { res.json(await ml.segments(users)); } catch { throw new HttpError(503, 'The ML service is not reachable. Start it and try again.'); }
}));

module.exports = router;
