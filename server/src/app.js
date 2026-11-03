const path = require('path');
const fs = require('fs');
const express = require('express');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { HttpError } = require('./lib/http');

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', requireAuth, requireAdmin, require('./routes/admin'));
app.use('/api', requireAuth, require('./routes/study'));
app.use('/api', requireAuth, require('./routes/insights'));
app.use('/api', (req, res, next) => next(new HttpError(404, 'Not found.')));

// In production the API also serves the built React app
const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : err.message });
});

module.exports = app;
