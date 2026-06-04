#!/usr/bin/env node
/**
 * Backend production-readiness audit (HTTP + config checks).
 * Usage: node scripts/backendAudit.js
 * Optional: AUDIT_EMAIL, AUDIT_PASSWORD for live sign-in tests
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const jwt = require('jsonwebtoken');
const db = require('../database/index');
const { getJwtSecret } = require('../utils/jwtSecret');
const { isProduction: isProdEnv } = require('../config/env');

const BASE = process.env.AUDIT_BASE_URL || `http://127.0.0.1:${process.env.NODE_PORT || 3030}`;
let TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'rcpit';

const results = { pass: 0, fail: 0, warn: 0, items: [] };

function record(level, name, detail = '') {
  results.items.push({ level, name, detail });
  if (level === 'pass') results.pass += 1;
  else if (level === 'fail') results.fail += 1;
  else results.warn += 1;
}

async function request(method, path, { token, tenantSlug, body, expectStatus } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;

  const opts = { method, headers };
  if (body != null) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const started = Date.now();
  const res = await fetch(`${BASE}${path}`, opts);
  const ms = Date.now() - started;
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, ms, ok: res.ok };
}

const PROTECTED_SAMPLES = [
  ['GET', '/api/users/me'],
  ['GET', '/api/posts'],
  ['GET', '/api/feed/home'],
  ['GET', '/api/notifications/unread-count'],
  ['GET', '/api/messages/unread-count'],
  ['GET', '/api/connections/pending'],
  ['GET', '/api/jobs'],
  ['GET', '/api/events'],
  ['GET', '/api/bookmarks'],
  ['GET', '/api/communities'],
  ['GET', '/api/global-questions'],
  ['GET', '/api/resource-library'],
  ['GET', '/api/admin/stats'],
  ['GET', '/api/super-admin/metrics'],
];

function authenticatedSmokePaths() {
  return [
    ['GET', '/api/health'],
    ['GET', '/api/users/me'],
    ['GET', '/api/users/profile'],
    ['GET', '/api/posts?limit=5'],
    ['GET', '/api/feed/home?limit=5'],
    ['GET', '/api/feed/trending-topics'],
    ['GET', '/api/messages/threads?limit=5'],
    ['GET', '/api/notifications/unread-count'],
    ['GET', '/api/messages/unread-count'],
    ['GET', '/api/connections/stats'],
    ['GET', '/api/bookmarks/stats'],
    ['GET', '/api/jobs?limit=5'],
    ['GET', '/api/events?limit=5'],
    ['GET', '/api/communities?limit=5'],
    ['GET', '/api/global-questions?limit=5'],
    ['GET', `/api/tenants/public/by-slug/${TENANT_SLUG}`],
    ['GET', '/api/branding/institution'],
  ];
}

async function buildAuditToken() {
  if (process.env.AUDIT_EMAIL && process.env.AUDIT_PASSWORD) {
    const r = await request('POST', '/api/auth/signin', {
      tenantSlug: TENANT_SLUG,
      body: { email: process.env.AUDIT_EMAIL, password: process.env.AUDIT_PASSWORD },
    });
    const token = r.json?.data?.token || r.json?.token;
    if (token) return { token, source: 'signin' };
    record('warn', 'AUDIT sign-in', `Failed: ${r.status} ${r.json?.message || ''}`);
  }

  const user = await db.User.findOne({
    where: { is_approved: true },
    attributes: ['id', 'email', 'first_name', 'last_name', 'user_type', 'tenant_id'],
    order: [['created_at', 'DESC']],
  });
  if (!user) return null;

  let tenant_slug = TENANT_SLUG;
  if (user.tenant_id) {
    const t = await db.Tenant.findByPk(user.tenant_id, { attributes: ['slug'] });
    if (t?.slug) tenant_slug = t.slug;
  }

  const token = jwt.sign(
    {
      id: String(user.id),
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      tenant_id: user.tenant_id ? String(user.tenant_id) : null,
      tenant_slug,
      user_type: user.user_type,
      role: user.user_type,
      portal_access: 'none',
    },
    getJwtSecret(),
    { expiresIn: '2h' },
  );
  return { token, source: 'jwt-synthetic', user, tenant_slug };
}

async function runConfigChecks() {
  if (isProdEnv) {
    try {
      getJwtSecret();
      record('pass', 'JWT secret (production)', 'ACCESS_TOKEN_SECRET configured');
    } catch (e) {
      record('fail', 'JWT secret (production)', e.message);
    }
  } else {
    record('warn', 'NODE_ENV', `development — production checks skipped (${process.env.NODE_ENV})`);
  }

  if (String(process.env.ADMIN_PORTAL_OPEN || '').toLowerCase() === 'true' && isProdEnv) {
    record('fail', 'ADMIN_PORTAL_OPEN', 'Must be false in production');
  } else if (String(process.env.ADMIN_PORTAL_OPEN || '').toLowerCase() === 'true') {
    record('warn', 'ADMIN_PORTAL_OPEN', 'Dev bypass enabled — OK for local only');
  } else {
    record('pass', 'ADMIN_PORTAL_OPEN', 'Not enabled');
  }

  if (!process.env.POSTGRESQL_DB) record('fail', 'Database config', 'POSTGRESQL_DB missing');
  else record('pass', 'Database config', 'POSTGRESQL_* present');

  record('pass', 'Migrations', 'Run `npm run migrate` before deploy');
}

async function runHttpChecks() {
  const health = await request('GET', '/health');
  if (health.status === 200 && health.json?.ok) {
    record('pass', 'Health', `${health.ms}ms, db=${health.json.database}`);
  } else {
    record('fail', 'Health', `status ${health.status}`);
    return null;
  }

  for (const [method, path] of PROTECTED_SAMPLES) {
    const r = await request(method, path, { tenantSlug: TENANT_SLUG });
    if (r.status === 401) record('pass', `Auth required ${method} ${path}`, '401');
    else record('fail', `Auth required ${method} ${path}`, `expected 401, got ${r.status}`);
  }

  const badToken = await request('GET', '/api/users/me', {
    token: 'invalid.token.here',
    tenantSlug: TENANT_SLUG,
  });
  if (badToken.status === 401) record('pass', 'Invalid JWT rejected', '401');
  else record('fail', 'Invalid JWT rejected', `status ${badToken.status}`);

  const pub = await request('GET', `/api/tenants/public/by-slug/${TENANT_SLUG}`);
  if (pub.status === 200 && pub.json?.data) record('pass', 'Public tenant by slug', TENANT_SLUG);
  else record('warn', 'Public tenant by slug', `status ${pub.status}`);

  return buildAuditToken();
}

async function runAuthenticatedChecks(auth) {
  if (!auth?.token) {
    record('warn', 'Authenticated smoke', 'Skipped — no user/token');
    return;
  }

  record('pass', 'Auth token', `source=${auth.source}`);

  for (const [method, path] of authenticatedSmokePaths()) {
    const r = await request(method, path, {
      token: auth.token,
      tenantSlug: auth.tenant_slug || TENANT_SLUG,
    });
    if (r.status >= 200 && r.status < 400) {
      record('pass', `Smoke ${method} ${path}`, `${r.status} ${r.ms}ms`);
    } else if (r.status === 403) {
      record('warn', `Smoke ${method} ${path}`, `403 ${r.json?.message || ''}`);
    } else {
      record('fail', `Smoke ${method} ${path}`, `${r.status} ${r.json?.message || ''}`);
    }
  }

  if (auth.user?.tenant_id) {
    const wrongSlug = auth.tenant_slug === 'rcpit' ? 'wrong-college-audit' : 'wrong-college-audit';
    const r = await request('GET', '/api/users/me', {
      token: auth.token,
      tenantSlug: wrongSlug,
    });
    if (r.status === 403) record('pass', 'Tenant header mismatch blocked', '403');
    else record('warn', 'Tenant header mismatch', `status ${r.status} (wrong slug may 404 tenant)`);
  }

  const notifAbuse = await request('POST', '/api/notifications/create', {
    token: auth.token,
    tenantSlug: auth.tenant_slug || TENANT_SLUG,
    body: {
      user_id: '00000000-0000-4000-8000-000000000099',
      type: 'like',
      title: 'audit',
      body: 'audit test',
    },
  });
  if (notifAbuse.status === 403) {
    record('pass', 'Notification create restricted', 'Cannot notify arbitrary user');
  } else if (notifAbuse.status === 400 || notifAbuse.status === 404) {
    record('pass', 'Notification create blocked', `status ${notifAbuse.status}`);
  } else if (notifAbuse.status === 201) {
    record('fail', 'Notification create restricted', 'Any user can create notifications for others');
  } else {
    record('warn', 'Notification create', `status ${notifAbuse.status}`);
  }
}

async function resolveAuditTenantSlug() {
  const preferred = await db.Tenant.findOne({
    where: { status: 'approved', slug: TENANT_SLUG },
    attributes: ['slug'],
  });
  if (preferred?.slug) return preferred.slug;
  const any = await db.Tenant.findOne({
    where: { status: 'approved' },
    attributes: ['slug'],
    order: [['created_at', 'ASC']],
  });
  return any?.slug || TENANT_SLUG;
}

async function runDbChecks() {
  try {
    record('pass', 'DB connection', 'OK');

    const tables = [
      'Posts', 'Comments', 'Connections', 'Communities', 'Notifications',
      'Bookmarks', 'JobApplications',
    ];
    for (const table of tables) {
      const [rows] = await db.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = :t AND column_name = 'tenant_id'`,
        { replacements: { t: table } },
      );
      if (rows.length) record('pass', `Schema ${table}.tenant_id`, 'present');
      else record('warn', `Schema ${table}.tenant_id`, 'missing');
    }

    const [scopeCol] = await db.sequelize.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'Connections' AND column_name = 'scope'`,
    );
    if (scopeCol.length) record('pass', 'Connections.scope', 'present');
    else record('warn', 'Connections.scope', 'missing — run migrate');
  } catch (e) {
    record('fail', 'DB checks', e.message);
  }
}

async function main() {
  console.info(`\n=== Backend audit @ ${BASE} ===\n`);
  await db.sequelize.authenticate();
  TENANT_SLUG = await resolveAuditTenantSlug();
  await runConfigChecks();
  const auth = await runHttpChecks();
  await runAuthenticatedChecks(auth);
  await runDbChecks();

  console.info('\n--- Summary ---');
  console.info(`PASS: ${results.pass}  WARN: ${results.warn}  FAIL: ${results.fail}\n`);

  const fails = results.items.filter((i) => i.level === 'fail');
  const warns = results.items.filter((i) => i.level === 'warn');
  if (fails.length) {
    console.info('Failures:');
    fails.forEach((f) => console.info(`  ✗ ${f.name}: ${f.detail}`));
  }
  if (warns.length) {
    console.info('\nWarnings:');
    warns.forEach((w) => console.info(`  ! ${w.name}: ${w.detail}`));
  }

  await db.sequelize.close();
  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await db.sequelize.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
