const { loadTenantBrandingById } = require('../utils/tenantBranding');

/**
 * GET /api/branding/institution — current user's college/institute branding.
 * Supports refresh without full page reload (Cache-Control: short private cache).
 */
exports.getInstitutionBranding = async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      res.set('Cache-Control', 'private, max-age=60');
      return res.status(200).json({
        status: true,
        data: { branding: null },
      });
    }
    const branding = await loadTenantBrandingById(tenantId);
    res.set('Cache-Control', 'private, max-age=300');
    return res.status(200).json({
      status: true,
      data: { branding },
    });
  } catch (err) {
    console.error('getInstitutionBranding', err);
    return res.status(500).json({
      status: false,
      message: 'Could not load institution branding.',
    });
  }
};
