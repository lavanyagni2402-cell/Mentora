// Fills the database with clearly-marked DEMO data (users.is_demo = true) so the
// dashboards, AI model and admin analytics have something to show in a viva.
// Usage: npm run seed:demo        Remove: npm run seed:demo -- --remove
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');
const { migrate } = require('./migrate');

const SUBJECTS = [
  ['Deep Learning', 4, 4], ['Compiler Design', 3, 5], ['Computer Networks', 3, 3], ['Software Engineering', 3, 2],
  ['PBL-III', 2, 3], ['Natural Language Processing', 3, 4], ['Cloud Computing', 3, 2], ['Data Mining', 3, 3],
];
const TASKS = ['Assignment', 'Lab record', 'Quiz prep', 'Revise unit', 'Mini project milestone', 'Read chapter', 'Practice problems', 'Presentation slides'];
const FEEDBACK = [
  ['feature', 5, 'The study-next suggestion is really useful before quizzes. Calendar sync would make it perfect.'],
  ['design', 4, 'Dashboard is clean. Would like a darker theme for night study.'],
  ['ai', 3, 'Suggestions sometimes push a low-credit subject above my main exam subject.'],
  ['bug', 2, 'Timer reset when my phone screen locked during a session.'],
  ['feature', 4, 'Please add group study rooms for project teams.'],
  ['other', 5, 'Helped me finish my lab records on time this week.'],
];
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@1234';

let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rand() * a.length)];
const daysAgo = (n, hour = 18) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(hour, Math.floor(rand() * 60), 0, 0); return d; };
const isoDay = (d) => d.toISOString().slice(0, 10);

async function remove(c) {
  await c.query('DELETE FROM feedback WHERE user_id IN (SELECT id FROM users WHERE is_demo)');
  await c.query('DELETE FROM users WHERE is_demo');
}

async function seedStudent(c, { name, email, discipline, showcase = false }, hash) {
  const { rows: [u] } = await c.query(
    `INSERT INTO users (name, email, password_hash, semester, is_demo, created_at, last_login_at)
     VALUES ($1,$2,$3,5,TRUE,$4,now()) RETURNING id`,
    [name, email, hash, daysAgo(40 + Math.floor(rand() * 10))]);
  const subs = [];
  const chosen = showcase ? SUBJECTS.slice(0, 5) : [...SUBJECTS].sort(() => rand() - 0.5).slice(0, 4 + Math.floor(rand() * 2));
  for (let i = 0; i < chosen.length; i++) {
    const [sn, cr, df] = chosen[i];
    const { rows: [s] } = await c.query('INSERT INTO subjects (user_id, name, credits, difficulty, color, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [u.id, sn, cr, Math.max(1, Math.min(5, df + Math.round(rand() * 2 - 1))), i % 7, daysAgo(40)]);
    subs.push({ id: s.id, name: sn });
  }
  // past tasks with outcomes driven by discipline
  for (let d = 40; d > 0; d -= 2 + Math.floor(rand() * 3)) {
    const s = pick(subs);
    const created = daysAgo(d + 3 + Math.floor(rand() * 6));
    const due = daysAgo(d);
    const late = rand() > discipline + 0.1;
    const missed = late && rand() < 0.25 && d < 6;
    const completed = missed ? null : daysAgo(late ? d - 1 - Math.floor(rand() * 2) : d + Math.floor(rand() * 2), 20);
    await c.query(
      `INSERT INTO tasks (user_id, subject_id, title, due_date, priority, estimated_minutes, status, completed_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [u.id, s.id, `${pick(TASKS)} – ${s.name}`, isoDay(due), pick(['low', 'medium', 'medium', 'high']), 30 + Math.floor(rand() * 8) * 15,
       missed ? 'pending' : 'done', completed && completed > new Date() ? new Date() : completed, created]);
  }
  // upcoming tasks
  const upcoming = showcase ? [
    [1, 'Compiler Design', 'Lab: lexical analyser using Lex', 'high', 120],
    [2, 'Deep Learning', 'Assignment 2: CNN on CIFAR-10', 'high', 240],
    [0, 'Deep Learning', 'Watch lecture 9: RNNs and LSTMs', 'low', 60],
    [3, 'Computer Networks', 'Quiz 2 prep: TCP congestion control', 'high', 90],
    [4, 'PBL-III', 'Integrate ML service with the API', 'medium', 180],
    [6, 'Software Engineering', 'SRS document draft', 'medium', 120],
    [9, 'Computer Networks', 'Wireshark lab report', 'medium', 60],
  ] : Array.from({ length: 3 + Math.floor(rand() * 4) }, () => { const s = pick(subs); return [Math.floor(rand() * 10) - 1, s.name, `${pick(TASKS)} – ${s.name}`, pick(['low', 'medium', 'high']), 30 + Math.floor(rand() * 10) * 15]; });
  for (const [inDays, sn, title, prio, est] of upcoming) {
    const s = subs.find((x) => x.name === sn) || subs[0];
    await c.query('INSERT INTO tasks (user_id, subject_id, title, due_date, priority, estimated_minutes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [u.id, s.id, title, isoDay(daysAgo(-inDays)), prio, est, daysAgo(3)]);
  }
  // study sessions: more frequent for disciplined students; evening-heavy
  for (let d = 35; d >= 0; d--) {
    if (rand() > discipline * 0.9) continue;
    const n = 1 + (rand() < discipline * 0.6 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const s = showcase && d < 7 && k === 0 && rand() < 0.5 ? subs[0] : pick(subs);
      const dur = pick([25, 25, 25, 50, 50, 40, 30]);
      await c.query('INSERT INTO study_sessions (user_id, subject_id, started_at, duration_minutes) VALUES ($1,$2,$3,$4)',
        [u.id, s.id, daysAgo(d, pick([9, 11, 15, 18, 20, 21, 22])), dur]);
    }
  }
  return u.id;
}

async function run() {
  await migrate();
  const removeOnly = process.argv.includes('--remove');
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const c = await pool.connect();
  try {
  await c.query('BEGIN');
  await (async () => {
    await remove(c);
    if (removeOnly) return;
    await seedStudent(c, { name: 'Demo Student', email: 'demo@mentora.app', discipline: 0.75, showcase: true }, hash);
    const ids = [];
    for (let i = 1; i <= 36; i++) {
      const discipline = [0.9, 0.75, 0.55, 0.35][i % 4] + (rand() - 0.5) * 0.15;
      ids.push(await seedStudent(c, { name: `Demo Student ${String(i).padStart(2, '0')}`, email: `student${String(i).padStart(2, '0')}@demo.mentora.app`, discipline }, hash));
    }
    for (let i = 0; i < FEEDBACK.length; i++) {
      const [cat, rating, msg] = FEEDBACK[i];
      await c.query('INSERT INTO feedback (user_id, category, rating, message, status, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [ids[i * 3], cat, rating, msg, i < 2 ? 'resolved' : 'new', daysAgo(6 - i)]);
    }
  })();
  await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  console.log(removeOnly ? 'Demo data removed.' : `Demo data ready. Sign in as demo@mentora.app / ${DEMO_PASSWORD}`);
  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
