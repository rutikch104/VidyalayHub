/**
 * Centralized environment configuration (non-secret defaults + accessors).
 * Secrets remain in process.env only — never log passwords or JWT secrets.
 */
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';

function parseIntEnv(key, fallback) {
  const n = parseInt(String(process.env[key] ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = {
  NODE_ENV,
  isProduction,
  isDevelopment,
  port: parseIntEnv('NODE_PORT', 3030),
  trustProxy: process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true',
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '1mb',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  rateLimit: {
    windowMs: parseIntEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    max: parseIntEnv('RATE_LIMIT_MAX', isProduction ? 300 : 2000),
  },
  db: {
    poolMax: parseIntEnv('POSTGRESQL_POOL_MAX', isProduction ? 20 : 50),
    poolMin: parseIntEnv('POSTGRESQL_POOL_MIN', isProduction ? 2 : 10),
    poolAcquire: parseIntEnv('POSTGRESQL_POOL_ACQUIRE', 30000),
    poolIdle: parseIntEnv('POSTGRESQL_POOL_IDLE', 10000),
  },
  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local').toLowerCase(),
  },
};
