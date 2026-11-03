// Dashboard, progress, AI recommendations and student feedback
const express = require('express');
const { one, many } = require('../db/pool');
const { asyncH, check } = require('../lib/http');
const { todayISO, addDays, toISODate } = require('../lib/dates');
const { recommend } = require('../services/recommender');

const router = express.Router();

async function dailyMinutes(userId, days) {
  const rows = await many(
    `SELECT (started_at AT TIME ZONE 'Asia/Kolkata')::date AS d, SUM(duration_minutes)::int AS m
     FROM study_sessions WHERE user_id=$1 AND started_at >= now() - ($2 || ' days')::interval GROUP BY 1`, [userId, String(days + 1)]);
  const map = Object.fromEntries(rows.map((r) => [toISODate(r.d), r.m]));
  const today = todayISO();
  return Array.from({ length: days }, (_, i) => { const d = addDays(today, i - days + 1); return { date: d, minutes: map[d] || 0 }; });
}

router.get('/dashboard', asyncH(async (req, res) => {
  const today = todayISO();
  const stats = await one(
    `SELECT COUNT(*) FILTER (WHERE status='pending')::int AS pending,
            COUNT(*) FILTER (WHERE status='pending' AND due_date = $2::date)::int AS due_today,
            COUNT(*) FILTER (WHERE status='pending' AND due_date < $2::date)::int AS overdue,
            COUNT(*) FILTER (WHERE status='done' AND completed_at >= now() - interval '7 days')::int AS done_week
     FROM tasks WHERE user_id=$1`, [req.user.id, today]);
  const week = await dailyMinutes(req.user.id, 7);
  const upcoming = await many(
    `SELECT * FROM tasks WHERE user_id=$1 AND status='pending' AND due_date <= $2::date ORDER BY due_date LIMIT 10`, [req.user.id, addDays(today, 7)]);
  res.json({
    stats: { ...stats, minutesThisWeek: week.reduce((a, d) => a + d.minutes, 0) },
    week,
    upcoming: upcoming.map((t) => ({ id: t.id, title: t.title, dueDate: toISODate(t.due_date), priority: t.priority, subjectId: t.subject_id, status: t.status })),
  });
}));

router.get('/progress', asyncH(async (req, res) => {
  const uid = req.user.id;
  const subjects = await many('SELECT p.*, s.name, s.color FROM progress p JOIN subjects s ON s.id=p.subject_id WHERE p.user_id=$1 ORDER BY s.created_at', [uid]);
  const t = await one(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='done')::int AS done,
       COUNT(*) FILTER (WHERE status='done' AND due_date IS NOT NULL)::int AS dated,
       COUNT(*) FILTER (WHERE status='done' AND (completed_at AT TIME ZONE 'Asia/Kolkata')::date <= due_date)::int AS on_time
     FROM tasks WHERE user_id=$1`, [uid]);
  const s = await one('SELECT COUNT(*)::int AS sessions, COALESCE(SUM(duration_minutes),0)::int AS minutes FROM study_sessions WHERE user_id=$1', [uid]);
  const daily = await dailyMinutes(uid, 30);
  let streak = 0, i = daily.length - 1;
  if (daily[i].minutes === 0) i--;
  while (i >= 0 && daily[i].minutes > 0) { streak++; i--; }
  res.json({
    totals: { tasksTotal: t.total, tasksDone: t.done, onTimeRate: t.dated ? t.on_time / t.dated : null, sessions: s.sessions, minutes: s.minutes, streak },
    daily,
    subjects: subjects.map((p) => ({ subjectId: p.subject_id, name: p.name, color: p.color, tasksCompleted: Number(p.tasks_completed), tasksTotal: Number(p.tasks_total), studyHours: Number(Number(p.study_hours).toFixed(1)) })),
  });
}));

router.get('/recommendations', asyncH(async (req, res) => res.json(await recommend(req.user.id))));

router.post('/feedback', asyncH(async (req, res) => {
  const b = req.body;
  const f = await one('INSERT INTO feedback (user_id, category, rating, message) VALUES ($1,$2,$3,$4) RETURNING id',
    [req.user.id, check.oneOf(b.category, 'Category', ['feature', 'bug', 'design', 'ai', 'other']), check.int(b.rating, 'Rating', 1, 5), check.text(b.message, 'Message', 5, 2000)]);
  res.status(201).json(f);
}));
router.get('/feedback', asyncH(async (req, res) => {
  const rows = await many('SELECT * FROM feedback WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json(rows.map((f) => ({ id: f.id, category: f.category, rating: f.rating, message: f.message, status: f.status, adminReply: f.admin_reply, createdAt: f.created_at })));
}));

module.exports = router;
