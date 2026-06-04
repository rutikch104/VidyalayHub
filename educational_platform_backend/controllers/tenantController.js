const db = require('../database/index'); // Corrected import

const bcrypt = require('bcrypt');
const { resolveMediaUrl } = require('../utils/resolveMediaUrl');
const { slugify } = require('../database/ensureTenantSaasSchema');

function normalizeWebsiteInput(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  let s = String(raw).trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    // eslint-disable-next-line no-new
    new URL(s);
    return s;
  } catch {
    return null;
  }
}

/** Public: resolve tenant branding by slug (login / subdomain). */
exports.getTenantBySlugPublic = async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ status: false, message: 'Institution slug is required.' });
    }
    const tenant = await db.Tenant.findOne({
      where: { slug, status: 'approved' },
      attributes: ['tenant_id', 'name', 'slug', 'type', 'logo_url', 'website', 'about'],
      include: [
        {
          model: db.TenantAddress,
          as: 'addresses',
          attributes: ['city', 'state'],
          required: false,
        },
      ],
    });
    if (!tenant) {
      return res.status(404).json({ status: false, message: 'Institution not found.' });
    }
    const j = tenant.toJSON();
    const addr = (j.addresses && j.addresses[0]) || {};
    return res.status(200).json({
      status: true,
      data: {
        tenant_id: String(j.tenant_id),
        slug: j.slug,
        name: j.name,
        type: j.type,
        logo_url: j.logo_url ? resolveMediaUrl(j.logo_url) : null,
        website: j.website,
        about: j.about,
        city: addr.city || '',
        state: addr.state || '',
      },
    });
  } catch (err) {
    console.error('getTenantBySlugPublic', err);
    return res.status(500).json({ status: false, message: 'Could not load institution.' });
  }
};

/** Public list for student signup dropdown — only approved colleges. */
exports.listApprovedTenantsPublic = async (req, res) => {
  try {
    const rows = await db.Tenant.findAll({
      where: { status: 'approved' },
      attributes: ['tenant_id', 'name', 'slug', 'type', 'logo_url', 'created_at'],
      include: [
        {
          model: db.TenantAddress,
          as: 'addresses',
          attributes: ['city', 'state'],
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });
    const colleges = rows.map((row) => {
      const j = row.toJSON();
      const addr = (j.addresses && j.addresses[0]) || {};
      const logoRaw = j.logo_url || '';
      return {
        tenant_id: String(j.tenant_id),
        slug: j.slug || null,
        name: j.name,
        type: j.type,
        logo_url: logoRaw ? resolveMediaUrl(logoRaw) : null,
        city: addr.city || '',
        state: addr.state || '',
      };
    });
    return res.status(200).json({ status: true, data: { colleges } });
  } catch (err) {
    console.error('listApprovedTenantsPublic', err);
    return res.status(500).json({ status: false, message: 'Could not load colleges.' });
  }
};

exports.createTenant = async (req, res) => {
  const t = await db.sequelize.transaction(); // Transaction begin
  try {
    const {
      name,
      type,
      affiliation,
      accreditation_status,
      established_year,
      website,
      logo_url,
      about,
      full_address,
      city,
      state,
      pincode,
      country = 'India',
      campus_locations,
      programs_offered,
      streams_offered,
      student_capacity,
      faculty_strength,
      library_facility,
      lab_facility,
      sports_facility,
      email,
      password,
      confirm_password
    } = req.body;

    if (password !== confirm_password) {
      return res.status(400).json({ status: false, message: 'Passwords do not match.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const websiteClean = normalizeWebsiteInput(website);

    // 1. Create main tenant (awaits super-admin approval before students can select it)
    let baseSlug = slugify(name);
    if (/rcpatel|rajarambapu/i.test(String(name))) baseSlug = 'rcpit';
    let candidateSlug = baseSlug;
    let slugAttempt = 0;
    for (;;) {
      const existing = await db.Tenant.findOne({ where: { slug: candidateSlug }, transaction: t });
      if (!existing) break;
      slugAttempt += 1;
      candidateSlug = `${baseSlug}-${slugAttempt}`;
    }

    const tenant = await db.Tenant.create({
      name,
      slug: candidateSlug,
      type,
      affiliation,
      accreditation_status,
      established_year,
      website: websiteClean,
      logo_url,
      about,
      status: 'pending',
    }, { transaction: t });

    const tenant_id = tenant.tenant_id;

    // 2. Address
    await db.TenantAddress.create({
      tenant_id,
      full_address,
      city,
      state,
      pincode,
      country,
      campus_locations
    }, { transaction: t });

    // 3. Academic Info
    await db.TenantAcademic.create({
      tenant_id,
      programs_offered,
      streams_offered,
      student_capacity,
      faculty_strength,
      library_facility,
      lab_facility,
      sports_facility
    }, { transaction: t });

    // 4. Verification Info
    await db.TenantVerification.create({
      tenant_id,
      email,
      password: hashedPassword,
      role: 'admin',
    }, { transaction: t });

    // Commit transaction
    await t.commit();

    return res.status(201).json({
      status: true,
      message:
        'Your college application has been submitted. It will appear as pending until a platform super admin approves it.',
      data: tenant,
    });
  } catch (err) {
    console.error("Error creating tenant:", err);
    await t.rollback(); // Rollback transaction
    return res.status(500).json({
      status: false,
      message: "Failed to create tenant.",
      error: err.message,
    });
  }
};


exports.createTenantAdmin = async (req, res) => {
  try {
    const { tenant_id, full_name, email, phone, password, department } = req.body;

    // Validation
    if (!tenant_id || !full_name || !email || !phone || !password) {
      return res.status(400).json({ status: false, message: "Required fields are missing." });
    }

    // Check if email is already registered
    const existingAdmin = await db.TenantAdmin.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(409).json({ status: false, message: "Admin with this email already exists." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create TenantAdmin
    const newAdmin = await db.TenantAdmin.create({
      tenant_id,
      full_name,
      email,
      phone,
      password: hashedPassword,
      department
    });

    return res.status(201).json({
      status: true,
      message: 'Tenant Admin created successfully.',
      data: newAdmin
    });

  } catch (err) {
    console.error("Error creating TenantAdmin:", err);
    return res.status(500).json({
      status: false,
      message: "Internal server error.",
      error: err.message
    });
  }
};

exports.getTenantById = async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await db.Tenant.findByPk(id, {
      include: [
        {
          model: db.TenantAddress,
          as: 'addresses'
        },

        {
          model: db.TenantAcademic,
          as: 'academics'
        },
        {
          model: db.TenantVerification,
          as: 'verifications',
          attributes: { exclude: ['password'] }
        },
        
      ]
    });

    if (!tenant) {
      return res.status(404).json({
        status: false,
        message: "Tenant not found.",
      });
    }

    return res.status(200).json({
      status: true,
      data: tenant,
    });
  } catch (err) {
    console.error("Error fetching tenant:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch tenant.",
      error: err.message,
    });
  }
};

exports.getPendingTenants = async (req, res) => {
  try {
    const tenants = await db.Tenant.findAll({
      where: { status: 'pending' },
    });

    return res.status(200).json({
      status: true,
      data: tenants,
    });
  } catch (err) {
    console.error("Error fetching pending tenants:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch pending tenants.",
      error: err.message,
    });
  }
};

exports.updateTenantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Invalid status value.",
      });
    }

    const tenant = await db.Tenant.findByPk(id);

    if (!tenant) {
      return res.status(404).json({
        status: false,
        message: "Tenant not found.",
      });
    }

    tenant.status = status;
    await tenant.save();

    return res.status(200).json({
      status: true,
      message: "Tenant status updated successfully.",
      data: tenant,
    });
  } catch (err) {
    console.error("Error updating tenant status:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to update tenant status.",
      error: err.message,
    });
  }
};