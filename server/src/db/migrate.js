const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, one, query } = require('./pool');
const config = require('../config');

async function migrate() {
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  // create the admin account from ADMIN_EMAIL / ADMIN_PASSWORD if it doesn't exist
  const { email, password, name } = config.admin;
  if (email && password && !(await one('SELECT id FROM users WHERE lower(email)=lower($1)', [email]))) {
    await query("INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'admin')", [name, email.toLowerCase(), await bcrypt.hash(password, 10)]);
  }
}
module.exports = { migrate };
