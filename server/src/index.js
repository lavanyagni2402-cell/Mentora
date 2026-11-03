const app = require('./app');
const config = require('./config');
const { migrate } = require('./db/migrate');

migrate()
  .then(() => app.listen(config.port, () => console.log(`Mentora API running on http://localhost:${config.port}`)))
  .catch((e) => { console.error('Could not start:', e.message); process.exit(1); });
