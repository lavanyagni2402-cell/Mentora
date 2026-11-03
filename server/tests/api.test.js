// API tests against a real PostgreSQL test database. Run with: npm test
// Uses only Node's built-in test runner and fetch.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgres://postgres@localhost:5432/mentora_test';
process.env.ADMIN_EMAIL = 'admin@test.mentora';
process.env.ADMIN_PASSWORD = 'AdminPass123';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { migrate } = require('../src/db/migrate');

let server, base;
const PW = 'Study1234';

// tiny browser-like client that keeps the session cookie
function client() {
  let cookie = '';
  const call = async (method, path, body) => {
    const r = await fetch(base + path, {
      method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined,
    });
    const set = r.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const data = r.status === 204 ? null : await r.json();
    return { status: r.status, body: data };
  };
  return { get: (p) => call('GET', p), post: (p, b) => call('POST', p, b || {}), patch: (p, b) => call('PATCH', p, b), del: (p) => call('DELETE', p) };
}
async function student(email, name = 'Test Student') {
  const c = client();
  const r = await c.post('/api/auth/register', { name, email, password: PW, semester: 5 });
  assert.equal(r.status, 201);
  return c;
}

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.close(); await pool.end(); });

test('register and sign in with email and password', async () => {
  const c = await student('riya@test.com');
  assert.equal((await c.get('/api/auth/me')).status, 200);
  await c.post('/api/auth/logout');
  assert.equal((await c.get('/api/auth/me')).status, 401);
  assert.equal((await client().post('/api/auth/login', { email: 'RIYA@test.com', password: 'Wrong1234' })).status, 401);
  const ok = await c.post('/api/auth/login', { email: 'RIYA@test.com', password: PW });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.email, 'riya@test.com');
});

test('rejects weak passwords and duplicate emails', async () => {
  assert.equal((await client().post('/api/auth/register', { name: 'X Y', email: 'weak@test.com', password: 'password' })).status, 400);
  await student('dup@test.com');
  assert.equal((await client().post('/api/auth/register', { name: 'X Y', email: 'DUP@test.com', password: PW })).status, 409);
});

test("students can't see each other's data", async () => {
  const a = await student('alice@test.com');
  const b = await student('bob@test.com');
  const s = await a.post('/api/subjects', { name: 'Compiler Design', difficulty: 5 });
  const t = await a.post('/api/tasks', { subjectId: s.body.id, title: 'Lab 4', priority: 'high', dueDate: '2030-01-01' });
  assert.equal(t.status, 201);
  assert.equal((await b.get('/api/tasks')).body.length, 0);
  assert.equal((await b.patch(`/api/tasks/${t.body.id}`, { status: 'done' })).status, 404);
  const done = await a.patch(`/api/tasks/${t.body.id}`, { status: 'done' });
  assert.equal(done.body.status, 'done');
  assert.equal(done.body.title, 'Lab 4');
});

test('sessions feed the dashboard, progress and AI recommendations', async () => {
  const a = await student('carol@test.com');
  const s1 = (await a.post('/api/subjects', { name: 'Deep Learning', difficulty: 4 })).body;
  const s2 = (await a.post('/api/subjects', { name: 'Networks', difficulty: 2 })).body;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const urgent = (await a.post('/api/tasks', { subjectId: s1.id, title: 'CNN assignment', priority: 'high', dueDate: today, estimatedMinutes: 180 })).body;
  await a.post('/api/tasks', { subjectId: s2.id, title: 'Read chapter 5', priority: 'low', dueDate: '2030-01-01', estimatedMinutes: 45 });
  assert.equal((await a.post('/api/sessions', { subjectId: s1.id, taskId: urgent.id, durationMinutes: 25 })).status, 201);

  const d = (await a.get('/api/dashboard')).body;
  assert.equal(d.stats.due_today, 1);
  assert.equal(d.stats.minutesThisWeek, 25);
  const p = (await a.get('/api/progress')).body;
  assert.equal(p.totals.sessions, 1);
  const r = (await a.get('/api/recommendations')).body;
  assert.equal(r.items[0].taskId, urgent.id, 'the urgent, high-priority task ranks first');
  assert.ok(r.items[0].reasons.length > 0);
});

test('feedback, admin access and disabling users', async () => {
  const st = await student('dave@test.com');
  assert.equal((await st.post('/api/feedback', { category: 'feature', rating: 4, message: 'Please add calendar sync' })).status, 201);
  assert.equal((await st.get('/api/admin/stats')).status, 403, 'students are blocked from admin APIs');

  const ad = client();
  assert.equal((await ad.post('/api/auth/login', { email: 'admin@test.mentora', password: 'AdminPass123' })).body.user.role, 'admin');
  assert.ok((await ad.get('/api/admin/stats')).body.students >= 5);
  const item = (await ad.get('/api/admin/feedback')).body.find((x) => x.message.includes('calendar'));
  await ad.patch(`/api/admin/feedback/${item.id}`, { adminReply: 'Planned for v2!' });
  assert.equal((await st.get('/api/feedback')).body[0].adminReply, 'Planned for v2!');

  const dave = (await ad.get('/api/admin/users?q=dave')).body[0];
  await ad.patch(`/api/admin/users/${dave.id}`, { isActive: false });
  assert.equal((await st.get('/api/auth/me')).status, 401, 'a disabled account is signed out');

  const ml = (await ad.get('/api/admin/ml')).body;
  if (ml.online) assert.equal((await ad.post('/api/admin/ml/retrain')).status, 200);
});
