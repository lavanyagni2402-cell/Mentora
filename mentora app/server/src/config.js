// All settings come from environment variables (Render dashboard, or server/.env locally)
const isProd = process.env.NODE_ENV === 'production';

let mlUrl = process.env.ML_URL || 'http://localhost:8000';
if (!mlUrl.startsWith('http')) mlUrl = 'http://' + mlUrl; // Render gives host:port

const config = {
  isProd,
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/mentora',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
  mlUrl,
  admin: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, name: process.env.ADMIN_NAME || 'Mentora Admin' },
};

if (isProd && !process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production');
module.exports = config;
