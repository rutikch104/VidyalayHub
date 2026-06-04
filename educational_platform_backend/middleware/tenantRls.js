/**
 * Sets PostgreSQL session variables for row-level security policies.
 * Enable with ENABLE_TENANT_RLS=true (off by default).
 */
const db = require('../database/index');
const { isPlatformUser, normalizeTenantId } = require('../utils/tenantScope');

function rlsEnabled() {
  const v = String(process.env.ENABLE_TENANT_RLS || '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

async function setTenantRlsContext(req) {
  if (!rlsEnabled() || db.sequelize.getDialect() !== 'postgres') return;

  const bypass = isPlatformUser(req.user) ? 'true' : 'false';
  const tenantId = normalizeTenantId(req.user?.tenant_id || req.tenant?.id) || '';
  const userId = req.user?.id ? String(req.user.id) : '';

  await db.sequelize.query(`SELECT set_config('app.rls_active', 'true', false)`);
  await db.sequelize.query(`SELECT set_config('app.bypass_rls', :bypass, false)`, {
    replacements: { bypass },
  });
  await db.sequelize.query(`SELECT set_config('app.current_tenant_id', :tid, false)`, {
    replacements: { tid: tenantId },
  });
  await db.sequelize.query(`SELECT set_config('app.current_user_id', :uid, false)`, {
    replacements: { uid: userId },
  });
}

/**
 * Run after authenticate + assertTenantAccess.
 */
async function tenantRlsMiddleware(req, res, next) {
  if (!req.user) return next();
  try {
    await setTenantRlsContext(req);
    return next();
  } catch (err) {
    console.error('tenantRlsMiddleware', err);
    return res.status(500).json({ status: false, message: 'Could not set database tenant context.' });
  }
}

module.exports = { tenantRlsMiddleware, setTenantRlsContext, rlsEnabled };
