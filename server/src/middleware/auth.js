const jwt = require('jsonwebtoken');
const config = require('../config');
const { one } = require('../db/pool');
const { HttpError } = require('../lib/http');

const COOKIE = 'mentora_session';

// Session = signed JWT in an httpOnly cookie (JavaScript in the page can't read it)
function startSession(res, user) {
  const token = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: 7 * 86400000 });
}
const endSession = (res) => res.clearCookie(COOKIE);

function readCookie(req) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}

async function requireAuth(req, res, next) {
  try {
    const token = readCookie(req);
    if (!token) throw new HttpError(401, 'Please sign in.');
    let payload;
    try { payload = jwt.verify(token, config.jwtSecret); } catch { throw new HttpError(401, 'Your session has expired. Please sign in again.'); }
    const user = await one('SELECT id, name, email, role, semester, is_active, is_demo FROM users WHERE id=$1', [payload.sub]);
    if (!user || !user.is_active) throw new HttpError(401, 'Please sign in.');
    req.user = user;
    next();
  } catch (e) { next(e); }
}

const requireAdmin = (req, res, next) => (req.user.role === 'admin' ? next() : next(new HttpError(403, 'Admin access only.')));

module.exports = { startSession, endSession, requireAuth, requireAdmin };
