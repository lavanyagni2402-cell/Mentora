// Student data: subjects, tasks, study sessions (every query is limited to the signed-in user)
const express = require('express');
const { one, many, query } = require('../db/pool');
const { asyncH, check, HttpError } = require('../lib/http');
const { toISODate } = require('../lib/dates');

const router = express.Router();

const subjectOut = (s) => ({ id: s.id, name: s.name, credits: s.credits, difficulty: s.difficulty, color: s.color });
const taskOut = (t) => ({
  id: t.id, subjectId: t.subject_id, title: t.title, dueDate: t.due_date ? toISODate(t.due_date) : null,
  priority: t.priority, estimatedMinutes: t.estimated_minutes, status: t.status, completedAt: t.completed_at, spentMinutes: t.spent ?? 0,
});

async function ownSubject(userId, id) {
  check.id(id);
  if (!(await one('SELECT id FROM subjects WHERE id=$1 AND user_id=$2', [id, userId]))) throw new HttpError(404, 'Subject not found.');
}
async function ownTask(userId, id) {
  check.id(id);
  const t = await one('SELECT * FROM tasks WHERE id=$1 AND user_id=$2', [id, userId]);
  if (!t) throw new HttpError(404, 'Task not found.');
  return t;
}

// ---- subjects ----
const subjectBody = (b, cur = {}) => ({
  name: b.name !== undefined ? check.text(b.name, 'Subject name', 1, 60) : cur.name,
  credits: check.int(b.credits, 'Credits', 0, 10, cur.credits ?? 3),
  difficulty: check.int(b.difficulty, 'Difficulty', 1, 5, cur.difficulty ?? 3),
  color: check.int(b.color, 'Colour', 0, 6, cur.color ?? 0),
});
router.get('/subjects', asyncH(async (req, res) => {
  res.json((await many('SELECT * FROM subjects WHERE user_id=$1 ORDER BY created_at', [req.user.id])).map(subjectOut));
}));
router.post('/subjects', asyncH(async (req, res) => {
  const b = subjectBody(req.body);
  if (!b.name) throw new HttpError(400, 'Subject name is required');
  const s = await one('INSERT INTO subjects (user_id, name, credits, difficulty, color) VALUES ($1,$2,$3,$4,$5) RETURNING *', [req.user.id, b.name, b.credits, b.difficulty, b.color]);
  res.status(201).json(subjectOut(s));
}));
router.patch('/subjects/:id', asyncH(async (req, res) => {
  await ownSubject(req.user.id, req.params.id);
  const cur = await one('SELECT * FROM subjects WHERE id=$1', [req.params.id]);
  const b = subjectBody(req.body, cur);
  const s = await one('UPDATE subjects SET name=$2, credits=$3, difficulty=$4, color=$5 WHERE id=$1 RETURNING *', [cur.id, b.name, b.credits, b.difficulty, b.color]);
  res.json(subjectOut(s));
}));
router.delete('/subjects/:id', asyncH(async (req, res) => {
  await ownSubject(req.user.id, req.params.id);
  await query('DELETE FROM subjects WHERE id=$1', [req.params.id]);
  res.status(204).end();
}));

// ---- tasks ----
router.get('/tasks', asyncH(async (req, res) => {
  const rows = await many(
    `SELECT t.*, COALESCE((SELECT SUM(duration_minutes) FROM study_sessions s WHERE s.task_id=t.id),0)::int AS spent
     FROM tasks t WHERE t.user_id=$1 ORDER BY t.status, t.due_date NULLS LAST, t.created_at`, [req.user.id]);
  res.json(rows.map(taskOut));
}));
router.post('/tasks', asyncH(async (req, res) => {
  const b = req.body;
  await ownSubject(req.user.id, b.subjectId);
  const t = await one(
    'INSERT INTO tasks (user_id, subject_id, title, due_date, priority, estimated_minutes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.user.id, b.subjectId, check.text(b.title, 'Title', 1, 140), check.date(b.dueDate),
     check.oneOf(b.priority, 'Priority', ['low', 'medium', 'high'], 'medium'), check.int(b.estimatedMinutes, 'Estimated minutes', 5, 1440, 60)]);
  res.status(201).json(taskOut(t));
}));
router.patch('/tasks/:id', asyncH(async (req, res) => {
  const cur = await ownTask(req.user.id, req.params.id);
  const b = req.body;
  if (b.subjectId) await ownSubject(req.user.id, b.subjectId);
  const status = check.oneOf(b.status, 'Status', ['pending', 'done'], cur.status);
  const completedAt = status === 'done' ? cur.completed_at || new Date() : null;
  const t = await one(
    `UPDATE tasks SET subject_id=$2, title=$3, due_date=$4, priority=$5, estimated_minutes=$6, status=$7, completed_at=$8 WHERE id=$1 RETURNING *`,
    [cur.id, b.subjectId || cur.subject_id, b.title !== undefined ? check.text(b.title, 'Title', 1, 140) : cur.title,
     b.dueDate !== undefined ? check.date(b.dueDate) : cur.due_date, check.oneOf(b.priority, 'Priority', ['low', 'medium', 'high'], cur.priority),
     check.int(b.estimatedMinutes, 'Estimated minutes', 5, 1440, cur.estimated_minutes), status, completedAt]);
  res.json(taskOut(t));
}));
router.delete('/tasks/:id', asyncH(async (req, res) => {
  await ownTask(req.user.id, req.params.id);
  await query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
  res.status(204).end();
}));

// ---- study sessions ----
router.get('/sessions/today', asyncH(async (req, res) => {
  const rows = await many(
    `SELECT * FROM study_sessions WHERE user_id=$1 AND (started_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
     ORDER BY started_at DESC`, [req.user.id]);
  res.json(rows.map((s) => ({ id: s.id, subjectId: s.subject_id, taskId: s.task_id, startedAt: s.started_at, durationMinutes: s.duration_minutes })));
}));
router.post('/sessions', asyncH(async (req, res) => {
  const b = req.body;
  await ownSubject(req.user.id, b.subjectId);
  if (b.taskId) await ownTask(req.user.id, b.taskId);
  const mins = check.int(b.durationMinutes, 'Duration', 1, 600);
  const s = await one('INSERT INTO study_sessions (user_id, subject_id, task_id, started_at, duration_minutes) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [req.user.id, b.subjectId, b.taskId || null, new Date(Date.now() - mins * 60000), mins]);
  res.status(201).json(s);
}));

module.exports = router;
