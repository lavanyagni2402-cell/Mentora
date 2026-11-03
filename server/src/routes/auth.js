const express = require('express');
const bcrypt = require('bcryptjs');
const { one, query } = require('../db/pool');
const { asyncH, check, HttpError } = require('../lib/http');
const { startSession, endSession, requireAuth } = require('../middleware/auth');

const router = express.Router();
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, semester: u.semester, isDemo: u.is_demo });

function checkEmail(v) {
  const e = check.text(v, 'Email', 3, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new HttpError(400, 'Enter a valid email address');
  return e;
}
function checkPassword(v) {
  if (typeof v !== 'string' || v.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) throw new HttpError(400, 'Password must contain a letter and a number');
  return v;
}

router.post('/register', asyncH(async (req, res) => {
  const name = check.text(req.body.name, 'Name', 2, 60);
  const email = checkEmail(req.body.email);
  const password = checkPassword(req.body.password);
  const semester = check.int(req.body.semester, 'Semester', 1, 10, null);
  if (await one('SELECT id FROM users WHERE lower(email)=$1', [email])) throw new HttpError(409, 'An account with this email already exists.');
  const user = await one('INSERT INTO users (name, email, password_hash, semester) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, email, await bcrypt.hash(password, 10), semester]);
  startSession(res, user);
  res.status(201).json({ user: publicUser(user) });
}));

router.post('/login', asyncH(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await one('SELECT * FROM users WHERE lower(email)=$1', [email]);
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password_hash))) throw new HttpError(401, 'Incorrect email or password.');
  if (!user.is_active) throw new HttpError(403, 'This account has been disabled. Contact the administrator.');
  await query('UPDATE users SET last_login_at=now() WHERE id=$1', [user.id]);
  startSession(res, user);
  res.json({ user: publicUser(user) });
}));

router.post('/logout', (req, res) => { endSession(res); res.json({ ok: true }); });
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
