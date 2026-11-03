-- Mentora central database (PostgreSQL 14+)
-- Tables follow the ER diagram: USER, SUBJECT, TASK, STUDY_SESSION, RECOMMENDATION, PROGRESS (view), plus FEEDBACK.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  semester       INT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  is_demo        BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  credits     INT NOT NULL DEFAULT 3,
  difficulty  INT NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  color       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id         UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  due_date           DATE,
  priority           TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  estimated_minutes  INT NOT NULL DEFAULT 60,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_user_idx ON tasks (user_id, status);

CREATE TABLE IF NOT EXISTS study_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id        UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  task_id           UUID REFERENCES tasks(id) ON DELETE SET NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes  INT NOT NULL CHECK (duration_minutes > 0)
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON study_sessions (user_id, started_at);

CREATE TABLE IF NOT EXISTS recommendations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id              UUID REFERENCES tasks(id) ON DELETE CASCADE,
  subject_id           UUID REFERENCES subjects(id) ON DELETE CASCADE,
  recommendation_text  TEXT NOT NULL,
  score                REAL NOT NULL,
  risk                 REAL NOT NULL,
  reasons              JSONB NOT NULL DEFAULT '[]',
  generated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  category     TEXT NOT NULL,
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','resolved')),
  admin_reply  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROGRESS from the ER diagram, always computed from tasks and sessions
CREATE OR REPLACE VIEW progress AS
SELECT s.user_id, s.id AS subject_id,
  COUNT(t.id) FILTER (WHERE t.status = 'done') AS tasks_completed,
  COUNT(t.id) AS tasks_total,
  COALESCE((SELECT SUM(duration_minutes) FROM study_sessions ss WHERE ss.subject_id = s.id), 0) / 60.0 AS study_hours
FROM subjects s LEFT JOIN tasks t ON t.subject_id = s.id
GROUP BY s.user_id, s.id;
