const db = require('../database/index');
const { resolveMediaUrl } = require('../utils/resolveMediaUrl');
const {
  descriptorFromMulterFile,
  replaceStoredMedia,
} = require('../services/mediaUploadService');
const { recordMediaAsset } = require('../services/mediaAssetService');

const TENANT_TYPES = new Set(['University', 'Engineering', 'Arts College']);
const ACCREDITATION_STATUSES = new Set(['NAAC A+', 'UGC Approved']);

function normalizeTenantType(raw) {
  const t = raw ? String(raw).trim() : '';
  if (TENANT_TYPES.has(t)) return t;
  if (/engineer/i.test(t)) return 'Engineering';
  if (/art/i.test(t)) return 'Arts College';
  return 'University';
}

function normalizeWebsite(domain) {
  if (domain == null) return undefined;
  const trimmed = String(domain).trim();
  if (trimmed === '') return null;
  let s = trimmed;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try { new URL(s); } catch { return null; }
  return s;
}

function blankToNull(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function parseYear(raw) {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n)) return null;
  if (n < 1800 || n > 2100) return null;
  return n;
}

async function loadTenantBundle(tenantId) {
  const tenant = await db.Tenant.findByPk(tenantId);
  if (!tenant) return null;
  const address = await db.TenantAddress.findOne({ where: { tenant_id: tenantId } });
  return { tenant, address };
}

function shapeCollegeProfile(tenant, address) {
  const t = tenant.toJSON ? tenant.toJSON() : tenant;
  const a = address ? (address.toJSON ? address.toJSON() : address) : null;
  const logoUrl = t.logo_url ? resolveMediaUrl(t.logo_url) : null;
  return {
    id: String(t.tenant_id),
    name: t.name || '',
    short_name: t.short_name || '',
    type: t.type || 'University',
    affiliation: t.affiliation || '',
    accreditation_status: t.accreditation_status || '',
    established_year: t.established_year != null ? t.established_year : null,
    website: t.website || '',
    contact_email: t.contact_email || '',
    contact_phone: t.contact_phone || '',
    about: t.about || '',
    description: t.description || '',
    logo_url: logoUrl,
    logo_storage_key: t.logo_url || null,
    logo_updated_at: t.logo_updated_at || null,
    profile_updated_at: t.profile_updated_at || null,
    updated_by: t.updated_by || null,
    status: t.status || 'pending',
    slug: t.slug || '',
    created_at: t.created_at || null,
    address: a
      ? {
          full_address: a.full_address || '',
          city: a.city || '',
          state: a.state || '',
          country: a.country || 'India',
          pincode: a.pincode || '',
          campus_locations: a.campus_locations || '',
        }
      : {
          full_address: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
          campus_locations: '',
        },
  };
}

/**
 * Resolve which tenant the current admin is allowed to manage.
 *
 * - College-scoped admins: their own tenant via JWT.tenant_id (RBAC by design).
 * - Super admins / platform admins: tenant_id query/body param can target any
 *   tenant; falls back to their own tenant_id if not provided.
 */
async function resolveTargetTenantId(req) {
  const explicit = String(req.query?.tenant_id || req.body?.tenant_id || '').trim();
  const isPrivileged = req.user?.super_admin_owner || req.portalAccess === 'platform';
  if (explicit && isPrivileged) return explicit;
  const own = req.user?.tenant_id || null;
  if (!own) {
    const err = new Error('Your account is not associated with a tenant.');
    err.status = 400;
    throw err;
  }
  return own;
}

exports.getMyCollege = async (req, res) => {
  try {
    const tenantId = await resolveTargetTenantId(req);
    const bundle = await loadTenantBundle(tenantId);
    if (!bundle) return res.status(404).json({ status: false, message: 'College not found.' });
    return res.status(200).json({
      status: true,
      data: shapeCollegeProfile(bundle.tenant, bundle.address),
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ status: false, message: err.message || 'Failed to load college.' });
  }
};

exports.updateMyCollege = async (req, res) => {
  try {
    const tenantId = await resolveTargetTenantId(req);
    const bundle = await loadTenantBundle(tenantId);
    if (!bundle) return res.status(404).json({ status: false, message: 'College not found.' });
    const { tenant, address } = bundle;

    const body = req.body || {};
    const updates = {};
    if (body.name !== undefined) {
      const n = String(body.name).trim();
      if (!n) return res.status(400).json({ status: false, message: 'College name cannot be empty.' });
      updates.name = n;
    }
    if (body.short_name !== undefined) updates.short_name = blankToNull(body.short_name);
    if (body.type !== undefined) updates.type = normalizeTenantType(body.type);
    if (body.affiliation !== undefined) updates.affiliation = blankToNull(body.affiliation);
    if (body.accreditation_status !== undefined) {
      const raw = String(body.accreditation_status || '').trim();
      updates.accreditation_status = ACCREDITATION_STATUSES.has(raw) ? raw : null;
    }
    if (body.established_year !== undefined) updates.established_year = parseYear(body.established_year);
    if (body.website !== undefined) {
      const w = normalizeWebsite(body.website);
      // normalizeWebsite returns undefined only when value is undefined; we want null for cleared field.
      updates.website = w === undefined ? null : w;
    }
    if (body.contact_email !== undefined) updates.contact_email = blankToNull(body.contact_email);
    if (body.contact_phone !== undefined) updates.contact_phone = blankToNull(body.contact_phone);
    if (body.about !== undefined) updates.about = blankToNull(body.about);
    if (body.description !== undefined) updates.description = blankToNull(body.description);

    updates.profile_updated_at = new Date();
    if (req.user?.id) updates.updated_by = req.user.id;
    await tenant.update(updates);

    // Optional logo replacement in the same multipart request.
    if (req.file) {
      try {
        await replaceStoredMedia(tenant.logo_url);
        const descriptor = await descriptorFromMulterFile(req.file, 'tenantLogo');
        await tenant.update({
          logo_url: descriptor.url,
          logo_updated_at: new Date(),
        });
        void recordMediaAsset(descriptor, {
          ownerId: req.user?.id || null,
          category: 'tenantLogo',
          entityType: 'tenant',
          entityId: tenant.tenant_id,
        });
      } catch (e) {
        console.warn('updateMyCollege: logo storage failed', e?.message || e);
      }
    }

    // Address sub-record — create on first save, update on subsequent.
    const addressUpdate = {};
    const a = body.address || {};
    if (a.full_address !== undefined) addressUpdate.full_address = blankToNull(a.full_address) || '';
    if (a.city !== undefined) addressUpdate.city = blankToNull(a.city) || '';
    if (a.state !== undefined) addressUpdate.state = blankToNull(a.state) || '';
    if (a.country !== undefined) addressUpdate.country = blankToNull(a.country) || 'India';
    if (a.pincode !== undefined) addressUpdate.pincode = blankToNull(a.pincode) || '';
    if (a.campus_locations !== undefined) addressUpdate.campus_locations = blankToNull(a.campus_locations);

    if (Object.keys(addressUpdate).length) {
      if (address) {
        await address.update(addressUpdate);
      } else if (
        addressUpdate.full_address &&
        addressUpdate.city &&
        addressUpdate.state &&
        addressUpdate.pincode
      ) {
        // TenantAddress has NOT NULL on full_address/city/state/pincode — only create when all four are provided.
        await db.TenantAddress.create({
          tenant_id: tenant.tenant_id,
          full_address: addressUpdate.full_address,
          city: addressUpdate.city,
          state: addressUpdate.state,
          country: addressUpdate.country || 'India',
          pincode: addressUpdate.pincode,
          campus_locations: addressUpdate.campus_locations || null,
        });
      }
    }

    const fresh = await loadTenantBundle(tenant.tenant_id);
    return res.status(200).json({
      status: true,
      message: 'College profile updated.',
      data: shapeCollegeProfile(fresh.tenant, fresh.address),
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ status: false, message: err.message || 'Failed to update college.' });
  }
};

exports.uploadMyCollegeLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'No logo file uploaded.' });
    }
    const tenantId = await resolveTargetTenantId(req);
    const bundle = await loadTenantBundle(tenantId);
    if (!bundle) return res.status(404).json({ status: false, message: 'College not found.' });
    const { tenant } = bundle;

    await replaceStoredMedia(tenant.logo_url);
    const descriptor = await descriptorFromMulterFile(req.file, 'tenantLogo');
    await tenant.update({
      logo_url: descriptor.url,
      logo_updated_at: new Date(),
      updated_by: req.user?.id || null,
    });
    void recordMediaAsset(descriptor, {
      ownerId: req.user?.id || null,
      category: 'tenantLogo',
      entityType: 'tenant',
      entityId: tenant.tenant_id,
    });

    const fresh = await loadTenantBundle(tenant.tenant_id);
    return res.status(200).json({
      status: true,
      message: 'Logo updated.',
      data: shapeCollegeProfile(fresh.tenant, fresh.address),
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ status: false, message: err.message || 'Failed to upload logo.' });
  }
};

exports.removeMyCollegeLogo = async (req, res) => {
  try {
    const tenantId = await resolveTargetTenantId(req);
    const bundle = await loadTenantBundle(tenantId);
    if (!bundle) return res.status(404).json({ status: false, message: 'College not found.' });
    const { tenant } = bundle;
    if (tenant.logo_url) {
      await replaceStoredMedia(tenant.logo_url);
      await tenant.update({
        logo_url: null,
        logo_updated_at: new Date(),
        updated_by: req.user?.id || null,
      });
    }
    const fresh = await loadTenantBundle(tenant.tenant_id);
    return res.status(200).json({
      status: true,
      message: 'Logo removed.',
      data: shapeCollegeProfile(fresh.tenant, fresh.address),
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ status: false, message: err.message || 'Failed to remove logo.' });
  }
};
