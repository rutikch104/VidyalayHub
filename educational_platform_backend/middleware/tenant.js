const db = require('../database/index');
const { isPlatformUser, normalizeTenantId, assertSameTenant } = require('../utils/tenantScope');

const TENANT_HEADER = 'x-tenant-slug';

function slugFromHost(host) {
  if (!host) return null;
  const h = String(host).split(':')[0].toLowerCase();
  const platformDomain = String(process.env.PLATFORM_DOMAIN || 'vidyalayhub.com').toLowerCase();
  if (h.endsWith(`.${platformDomain}`)) {
    const sub = h.slice(0, -(platformDomain.length + 1));
    if (sub && sub !== 'www' && sub !== 'app' && sub !== 'api') return sub;
  }
  return null;
}

async function resolveTenantBySlug(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return null;
  return db.Tenant.findOne({
    where: { slug: s, status: 'approved' },
    attributes: ['tenant_id', 'name', 'slug', 'logo_url', 'type', 'status'],
  });
}

/**
 * Resolves req.tenant from X-Tenant-Slug, Host subdomain, or DEFAULT_TENANT_SLUG.
 * Safe on public routes (no auth required).
 */
async function tenantResolver(req, res, next) {
  try {
    const rawHeader = req.get(TENANT_HEADER);
    const headerSlug =
      rawHeader && rawHeader.length <= 64 && !/^[0-9a-f-]{36}$/i.test(rawHeader)
        ? String(rawHeader).toLowerCase()
        : null;
    const hostSlug = slugFromHost(req.get('host'));
    const slug = headerSlug || hostSlug || String(process.env.DEFAULT_TENANT_SLUG || 'rcpit').toLowerCase();

    const tenant = await resolveTenantBySlug(slug);
    if (tenant) {
      req.tenant = {
        id: String(tenant.tenant_id),
        slug: tenant.slug,
        name: tenant.name,
        logo_url: tenant.logo_url,
        type: tenant.type,
      };
    } else {
      req.tenant = null;
    }
    return next();
  } catch (err) {
    console.error('tenantResolver', err);
    return res.status(500).json({ status: false, message: 'Could not resolve institution context.' });
  }
}

/**
 * After authenticate: block cross-tenant access for college users.
 * Platform / super-admin users may access any tenant context.
 */
function assertTenantAccess(req, res, next) {
  if (!req.user) return next();

  if (isPlatformUser(req.user)) return next();

  const userTenant = normalizeTenantId(req.user.tenant_id);
  const ctxTenant = req.tenant?.id ? normalizeTenantId(req.tenant.id) : null;

  if (!userTenant) {
    return res.status(403).json({
      status: false,
      message: 'Your account is not linked to an institution. Contact your college administrator.',
    });
  }

  if (ctxTenant && !assertSameTenant(userTenant, ctxTenant)) {
    return res.status(403).json({
      status: false,
      message: 'Access denied. Institution context does not match your account.',
    });
  }

  if (!req.tenant) {
    req.tenant = { id: userTenant, slug: req.user.tenant_slug || null, name: req.user.tenant_name || null };
  }

  return next();
}

module.exports = {
  tenantResolver,
  assertTenantAccess,
  TENANT_HEADER,
  resolveTenantBySlug,
};
