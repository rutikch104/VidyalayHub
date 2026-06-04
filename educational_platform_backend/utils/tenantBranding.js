const db = require('../database/index');
const { resolveMediaUrl } = require('./resolveMediaUrl');
const { resolvePortalAccessForAccount } = require('./portalAccess');

const TENANT_BRAND_ATTRIBUTES = ['tenant_id', 'slug', 'name', 'type', 'logo_url', 'status'];

/**
 * Normalize tenant row into a stable branding payload for clients.
 */
function formatTenantBranding(tenant) {
  if (!tenant) return null;
  const t = tenant.get ? tenant.get({ plain: true }) : tenant;
  const logoRaw = t.logo_url || '';
  const logo_url = logoRaw ? resolveMediaUrl(logoRaw) : null;
  return {
    tenant_id: String(t.tenant_id),
    slug: t.slug || null,
    name: (t.name || '').trim(),
    type: t.type || '',
    logo_url,
    logo_url_raw: logoRaw || null,
    status: t.status || 'approved',
  };
}

async function loadTenantBrandingById(tenantId) {
  if (!tenantId) return null;
  const row = await db.Tenant.findByPk(String(tenantId), {
    attributes: TENANT_BRAND_ATTRIBUTES,
  });
  return formatTenantBranding(row);
}

/**
 * Attach institution branding fields to an auth/user payload.
 */
async function enrichUserWithTenantBranding(userPayload) {
  if (!userPayload || typeof userPayload !== 'object') return userPayload;

  const portalMeta = await resolvePortalAccessForAccount({
    email: userPayload.email,
    user_type: userPayload.user_type,
    tenant_id: userPayload.tenant_id,
    portal_access: userPayload.portal_access,
    user_id: userPayload.id,
  });

  const tenantId =
    portalMeta.tenant_id ||
    (userPayload.tenant_id != null && String(userPayload.tenant_id).trim() !== ''
      ? String(userPayload.tenant_id)
      : null);

  const branding = tenantId ? await loadTenantBrandingById(tenantId) : null;

  return {
    ...userPayload,
    tenant_id: tenantId || userPayload.tenant_id || '',
    tenant_name: branding?.name || userPayload.tenant_name || '',
    tenant_slug: branding?.slug || userPayload.tenant_slug || null,
    tenant_type: branding?.type || userPayload.tenant_type || '',
    tenant_logo_url: branding?.logo_url ?? userPayload.tenant_logo_url ?? null,
    institution: branding,
    portal_access: portalMeta.access,
    is_institution_admin: portalMeta.is_institution_admin,
  };
}

module.exports = {
  TENANT_BRAND_ATTRIBUTES,
  formatTenantBranding,
  loadTenantBrandingById,
  enrichUserWithTenantBranding,
};
