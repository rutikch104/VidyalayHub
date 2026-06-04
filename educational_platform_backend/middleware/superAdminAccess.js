const db = require('../database/index');

/**
 * Super Admin API: platform-wide operations only.
 *
 * Allowed when ANY of:
 * - User email is listed in SUPER_ADMIN_EMAILS or PLATFORM_ADMIN_EMAILS (case-insensitive)
 * - A row exists in super_admins with matching email and access = true
 * - A row exists in main_admins with matching email and status = true
 * - SUPER_ADMIN_OPEN=true (development only — any authenticated user)
 */
async function requireSuperAdminAccess(req, res, next) {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ status: false, message: 'Authentication required.' });
    }

    const email = String(req.user.email).toLowerCase().trim();
    const rawLists = [
      ...String(process.env.SUPER_ADMIN_EMAILS || '').split(','),
      ...String(process.env.PLATFORM_ADMIN_EMAILS || '').split(','),
    ];
    const allowEmails = [...new Set(rawLists.map((s) => s.trim().toLowerCase()).filter(Boolean))];

    if (allowEmails.length > 0 && allowEmails.includes(email)) {
      req.superAdminVerified = 'allowlist';
      return next();
    }

    const owner = await db.superAdmin.findOne({
      where: { email, access: true },
    });
    if (owner) {
      req.superAdminVerified = 'super_admins_table';
      req.superAdminRole = 'super_admin_owner';
      return next();
    }

    const main = await db.mainAdmin.findOne({
      where: { email, status: true, role: 'super_admin' },
    });
    if (main) {
      req.superAdminVerified = 'main_admin';
      req.superAdminRole = main.role;
      return next();
    }

    const devOpen = String(process.env.SUPER_ADMIN_OPEN || '').toLowerCase() === 'true';
    if (devOpen) {
      req.superAdminVerified = 'dev_open';
      return next();
    }

    return res.status(403).json({
      status: false,
      message:
        'Super admin access denied. Add your email to SUPER_ADMIN_EMAILS (or PLATFORM_ADMIN_EMAILS), add an active row in super_admins (access=true), create an active main_admins super_admin account, or set SUPER_ADMIN_OPEN=true for local development.',
    });
  } catch (err) {
    console.error('requireSuperAdminAccess', err);
    return res.status(500).json({ status: false, message: 'Authorization check failed.' });
  }
}

module.exports = { requireSuperAdminAccess };
