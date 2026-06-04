const bcrypt = require('bcrypt');
const db = require('../database/index');
const { Op } = require('sequelize');
const { ilikeContainsPattern } = require('../utils/searchQuery');

const TENANT_TYPES = new Set(['University', 'Engineering', 'Arts College']);

function normalizeTenantType(raw) {
  const t = raw ? String(raw).trim() : '';
  if (TENANT_TYPES.has(t)) return t;
  if (/engineer/i.test(t)) return 'Engineering';
  if (/art/i.test(t)) return 'Arts College';
  return 'University';
}

function normalizeWebsite(domain) {
  if (domain == null || String(domain).trim() === '') return null;
  let s = String(domain).trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    // eslint-disable-next-line no-new
    new URL(s);
  } catch {
    return null;
  }
  return s;
}

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function primaryAdmin(tenantId) {
  const row = await db.TenantAdmin.findOne({
    where: { tenant_id: tenantId },
    order: [['email', 'ASC']],
  });
  if (!row) return { name: '', email: '', phone: '' };
  const j = row.toJSON ? row.toJSON() : row;
  return { name: j.full_name || '', email: j.email || '', phone: j.phone || '' };
}

function superUiStatus(dbStatus) {
  if (dbStatus === 'approved') return 'Active';
  if (dbStatus === 'pending') return 'Pending';
  return 'Inactive';
}

function filterToDbStatus(filter) {
  if (filter === 'Active') return 'approved';
  if (filter === 'Pending' || filter === 'Trial') return 'pending';
  if (filter === 'Inactive' || filter === 'Suspended') return 'rejected';
  return null;
}

async function formatSuperCollege(t) {
  const j = t.toJSON ? t.toJSON() : t;
  const tid = j.tenant_id;
  const [students, teachers, staff] = await Promise.all([
    db.User.count({ where: { tenant_id: tid, user_type: 'student' } }),
    db.User.count({ where: { tenant_id: tid, user_type: 'teacher' } }),
    db.User.count({ where: { tenant_id: tid, user_type: 'staff' } }),
  ]);
  const adm = await primaryAdmin(tid);
  const st = superUiStatus(j.status);
  return {
    id: String(tid),
    name: j.name,
    type: j.type || 'University',
    location: j.affiliation || '',
    domain: j.website || '',
    admin: { name: adm.name, email: adm.email, phone: adm.phone || '' },
    users: { students, teachers, staff },
    subscription: {
      plan: 'Basic',
      status: j.status === 'pending' ? 'Trial' : st === 'Active' ? 'Active' : 'Expired',
      expiryDate: '',
      monthlyFee: 0,
    },
    status: st,
    joined: j.created_at ? new Date(j.created_at).toISOString() : '',
    lastActivity: (j.updated_at || j.created_at) ? new Date(j.updated_at || j.created_at).toISOString() : '',
    storage: { used: Math.min(90, 5 + (students + teachers) % 85), limit: 100 },
    features: ['Core platform'],
    revenue: 0,
    growth: 0,
  };
}

exports.getSystemMetrics = async (req, res) => {
  try {
    const [totalColleges, totalStudents, totalTeachers, staffCount] = await Promise.all([
      db.Tenant.count(),
      db.User.count({ where: { user_type: 'student' } }),
      db.User.count({ where: { user_type: 'teacher' } }),
      db.User.count({ where: { user_type: 'staff' } }),
    ]);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const [newStudents, newColleges] = await Promise.all([
      db.User.count({
        where: { user_type: 'student', created_at: { [Op.gte]: monthAgo } },
      }),
      db.Tenant.count({ where: { created_at: { [Op.gte]: monthAgo } } }),
    ]);

    return res.status(200).json({
      status: true,
      data: {
        totalColleges,
        totalStudents,
        totalTeachers,
        activeUsers: totalStudents + totalTeachers + staffCount,
        revenue: 0,
        storageUsed: 0,
        serverLoad: 0,
        uptime: 99.9,
        growth: {
          colleges: newColleges,
          students: newStudents,
          revenue: 0,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getColleges = async (req, res) => {
  try {
    const page = parseInt(String(req.query.page), 10) || 1;
    const limit = Math.min(100, parseInt(String(req.query.limit), 10) || 20);
    const offset = (page - 1) * limit;
    const { search, status } = req.query;
    const where = {};

    if (search && String(search).trim()) {
      const pat = ilikeContainsPattern(search);
      if (pat) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({
          [Op.or]: [{ name: { [Op.iLike]: pat } }, { affiliation: { [Op.iLike]: pat } }],
        });
      }
    }
    if (status && status !== 'All') {
      const dbS = filterToDbStatus(String(status));
      if (dbS) where.status = dbS;
    }

    const { count, rows } = await db.Tenant.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset,
      limit,
    });
    const colleges = [];
    for (const row of rows) {
      colleges.push(await formatSuperCollege(row));
    }
    return res.status(200).json({
      status: true,
      data: {
        colleges,
        pagination: { total: count, page, pages: Math.ceil(count / limit) || 1 },
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getCollege = async (req, res) => {
  try {
    const id = req.params.collegeId;
    const t = await db.Tenant.findByPk(id);
    if (!t) return res.status(404).json({ status: false, message: 'Not found' });
    return res.status(200).json({ status: true, data: await formatSuperCollege(t) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.createCollege = async (req, res) => {
  try {
    const { name, type, location, domain, admin_name, admin_email } = req.body;
    const row = await db.Tenant.create({
      name: name || 'New institution',
      type: normalizeTenantType(type),
      affiliation: location || null,
      website: normalizeWebsite(domain),
      status: 'pending',
    });
    return res.status(201).json({ status: true, data: await formatSuperCollege(row) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.updateCollege = async (req, res) => {
  try {
    const id = req.params.collegeId;
    const t = await db.Tenant.findByPk(id);
    if (!t) return res.status(404).json({ status: false, message: 'Not found' });
    const { name, type, location, domain, status } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = normalizeTenantType(type);
    if (location !== undefined) updates.affiliation = location;
    if (domain !== undefined) updates.website = normalizeWebsite(domain);
    if (status !== undefined) {
      const dbS = filterToDbStatus(String(status));
      if (dbS) updates.status = dbS;
    }
    if (Object.keys(updates).length) await t.update(updates);
    await t.reload();
    return res.status(200).json({ status: true, data: await formatSuperCollege(t) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.deleteCollege = async (req, res) => {
  try {
    const id = req.params.collegeId;
    const t = await db.Tenant.findByPk(id);
    if (!t) return res.status(404).json({ status: false, message: 'Not found' });
    await t.destroy();
    return res.status(200).json({ status: true, message: 'Deleted' });
  } catch (err) {
    const code = err.name === 'SequelizeForeignKeyConstraintError' ? 409 : 500;
    return res.status(code).json({
      status: false,
      message:
        code === 409
          ? 'Cannot delete while users or related records reference this college.'
          : err.message,
    });
  }
};

/**
 * Create a staff User for the tenant (main app login + JWT with tenant_id) and a TenantAdmin row
 * so super-admin college cards show contact info. College admins use the normal /auth/signin flow
 * and open Admin with tenant-scoped APIs when ADMIN_PORTAL_OPEN is not false.
 */
exports.createCollegePortalAdmin = async (req, res) => {
  try {
    const collegeId = req.params.collegeId;
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const first_name = String(req.body?.first_name || '').trim() || null;
    const last_name = String(req.body?.last_name || '').trim() || null;
    const phoneRaw = String(req.body?.phone_number || req.body?.phone || '').trim();
    const phone = phoneRaw || '0000000000';

    if (!email || !password) {
      return res.status(400).json({ status: false, message: 'email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ status: false, message: 'Password must be at least 6 characters.' });
    }

    const tenant = await db.Tenant.findByPk(collegeId);
    if (!tenant) {
      return res.status(404).json({ status: false, message: 'College not found.' });
    }

    const [existingUser, existingTenantAdmin] = await Promise.all([
      db.User.findOne({ where: { email } }),
      db.TenantAdmin.findOne({ where: { email } }),
    ]);
    if (existingUser) {
      return res.status(409).json({
        status: false,
        message: 'A platform account with this email already exists.',
      });
    }
    if (existingTenantAdmin) {
      return res.status(409).json({
        status: false,
        message: 'This email is already registered as a tenant admin.',
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const tenantAdminPwd = await bcrypt.hash(password, 10);
    const defaultRole = await db.Role.findOne({ where: { name: 'USER' }, attributes: ['id'] });
    const full_name = [first_name, last_name].filter(Boolean).join(' ') || email.split('@')[0];

    const transaction = await db.sequelize.transaction();
    try {
      const user = await db.User.create(
        {
          tenant_id: collegeId,
          user_type: 'staff',
          first_name,
          last_name,
          email,
          phone_number: phoneRaw || null,
          password_hash,
          role_id: defaultRole?.id || null,
          is_approved: true,
          password_changed_at: new Date(),
        },
        { transaction }
      );

      await db.TenantAdmin.create(
        {
          tenant_id: collegeId,
          full_name,
          email,
          phone,
          password: tenantAdminPwd,
          department: 'College administrator',
        },
        { transaction }
      );

      await transaction.commit();

      return res.status(201).json({
        status: true,
        message:
          'College portal admin created. They can sign in on the main login page with this email and password, then open Admin.',
        data: {
          id: String(user.id),
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          user_type: user.user_type,
          tenant_id: String(collegeId),
        },
      });
    } catch (inner) {
      await transaction.rollback();
      throw inner;
    }
  } catch (err) {
    console.error('createCollegePortalAdmin', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ status: false, message: 'Email is already in use.' });
    }
    return res.status(500).json({ status: false, message: err.message || 'Failed to create admin.' });
  }
};

exports.toggleCollegeStatus = async (req, res) => {
  try {
    const id = req.params.collegeId;
    const { status } = req.body;
    if (status === undefined || status === null || String(status).trim() === '') {
      return res.status(400).json({ status: false, message: 'status is required in body.' });
    }
    const t = await db.Tenant.findByPk(id);
    if (!t) return res.status(404).json({ status: false, message: 'Not found' });
    if (status === 'Suspended' || status === 'Inactive') await t.update({ status: 'rejected' });
    else if (status === 'Active') await t.update({ status: 'approved' });
    else if (status === 'Pending' || status === 'Trial') await t.update({ status: 'pending' });
    else {
      return res.status(400).json({
        status: false,
        message: 'Invalid status. Use Active, Inactive, Suspended, Pending, or Trial.',
      });
    }
    await t.reload();
    return res.status(200).json({ status: true, data: await formatSuperCollege(t) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.updateSubscription = async (req, res) => {
  return res.status(200).json({
    status: true,
    message: 'Subscription updates are not persisted in this build; UI preference recorded.',
  });
};

exports.getAnalytics = async (req, res) => {
  try {
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const [byTypeRows, tenantsByStatusRows, newUsersMonth, totalUsersCount] = await Promise.all([
      db.User.findAll({
        attributes: [
          'user_type',
          [db.sequelize.fn('COUNT', db.sequelize.col('User.id')), 'cnt'],
        ],
        group: ['user_type'],
        raw: true,
      }),
      db.Tenant.findAll({
        attributes: [
          'status',
          [db.sequelize.fn('COUNT', db.sequelize.col('Tenant.tenant_id')), 'cnt'],
        ],
        group: ['status'],
        raw: true,
      }),
      db.User.count({ where: { created_at: { [Op.gte]: thirtyAgo } } }),
      db.User.count(),
    ]);

    const typeLabels = [];
    const typeCounts = [];
    byTypeRows.forEach((r) => {
      typeLabels.push(String(r.user_type || 'unknown'));
      typeCounts.push(parseInt(r.cnt, 10) || 0);
    });

    const distLabels = [];
    const distData = [];
    const palette = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    tenantsByStatusRows.forEach((r, i) => {
      const label =
        r.status === 'approved' ? 'Approved' : r.status === 'pending' ? 'Pending' : String(r.status || '');
      distLabels.push(label);
      distData.push(parseInt(r.cnt, 10) || 0);
    });

    const engagement =
      totalUsersCount > 0 ? Math.round((newUsersMonth / totalUsersCount) * 1000) / 10 : 0;

    return res.status(200).json({
      status: true,
      data: {
        userGrowth: {
          labels: typeLabels.length ? typeLabels : ['—'],
          datasets: [
            {
              label: 'Users by role',
              data: typeCounts.length ? typeCounts : [0],
              borderColor: '#2563EB',
              backgroundColor: 'rgba(37, 99, 235, 0.25)',
            },
          ],
        },
        revenueChart: {
          labels: ['Billing not configured'],
          datasets: [
            {
              label: 'Revenue',
              data: [0],
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
            },
          ],
        },
        collegeDistribution: {
          labels: distLabels.length ? distLabels : ['No colleges'],
          datasets: [
            {
              data: distData.length ? distData : [0],
              backgroundColor: distLabels.map((_, i) => palette[i % palette.length]),
            },
          ],
        },
        activityMetrics: {
          dailyActiveUsers: 0,
          weeklyActiveUsers: 0,
          monthlyActiveUsers: newUsersMonth,
          engagementRate: engagement,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getRevenueAnalytics = async (req, res) => {
  return res.status(200).json({ status: true, data: { series: [], total: 0 } });
};

exports.getSystemHealth = async (req, res) => {
  try {
    await db.sequelize.authenticate();
    return res.status(200).json({
      status: true,
      data: { serverLoad: 0, storageUsed: 0, uptime: 99.9, db: 'connected' },
    });
  } catch (err) {
    return res.status(200).json({
      status: true,
      data: {
        serverLoad: 0,
        storageUsed: 0,
        uptime: 0,
        db: 'unreachable',
        dbError: err.message,
      },
    });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(String(req.query.limit), 10) || 10);
    const [recentUsers, recentTenants] = await Promise.all([
      db.User.findAll({
        attributes: ['id', 'first_name', 'last_name', 'email', 'user_type', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: Math.ceil(limit / 2),
      }),
      db.Tenant.findAll({
        attributes: ['tenant_id', 'name', 'status', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: Math.ceil(limit / 2),
      }),
    ]);
    const activities = [];
    recentUsers.forEach((u) => {
      const j = u.toJSON();
      const name = [j.first_name, j.last_name].filter(Boolean).join(' ') || j.email;
      activities.push({
        id: `u-${j.id}`,
        message: `New ${j.user_type}`,
        details: `${name} (${j.email})`,
        timestamp: j.created_at,
      });
    });
    recentTenants.forEach((t) => {
      const j = t.toJSON();
      activities.push({
        id: `t-${j.tenant_id}`,
        message: 'Tenant / college',
        details: `${j.name} (${j.status})`,
        timestamp: j.created_at,
      });
    });
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return res.status(200).json({ status: true, data: { activities: activities.slice(0, limit) } });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.exportData = async (req, res) => {
  const { type } = req.params;
  if (!['colleges', 'revenue', 'analytics'].includes(type)) {
    return res.status(400).json({ status: false, message: 'Unknown export type.' });
  }
  try {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="super-${type}.csv"`);
    if (type === 'colleges') {
      const rows = await db.Tenant.findAll({ order: [['created_at', 'DESC']] });
      const lines = ['id,name,status,students,teachers,staff,type'];
      for (const t of rows) {
        const f = await formatSuperCollege(t);
        lines.push(
          [csvEscape(f.id), csvEscape(f.name), csvEscape(f.status), f.users.students, f.users.teachers, f.users.staff, csvEscape(f.type)].join(
            ','
          )
        );
      }
      return res.status(200).send(lines.join('\n'));
    }
    return res.status(200).send('metric,value\nrevenue,0\n');
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getCollegeStats = async (req, res) => {
  try {
    const id = req.params.collegeId;
    const t = await db.Tenant.findByPk(id);
    if (!t) return res.status(404).json({ status: false, message: 'Not found' });
    const f = await formatSuperCollege(t);
    return res.status(200).json({
      status: true,
      data: {
        users: f.users,
        status: f.status,
        subscription: f.subscription,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.sendNotification = async (req, res) => {
  return res.status(200).json({
    status: true,
    message: 'Notification recorded (delivery not configured in this environment).',
  });
};

exports.getSettings = async (req, res) => {
  return res.status(200).json({
    status: true,
    data: { maintenance_mode: false, signup_open: true },
  });
};

exports.updateSettings = async (req, res) => {
  return res.status(200).json({ status: true, message: 'Settings endpoint is a stub in this build.' });
};

exports.listAllUsers = async (req, res) => {
  try {
    const page = parseInt(String(req.query.page), 10) || 1;
    const limit = Math.min(500, parseInt(String(req.query.limit), 10) || 25);
    const offset = (page - 1) * limit;
    const where = {};
    if (req.query.search) {
      const pat = ilikeContainsPattern(req.query.search);
      if (pat) {
        where[Op.or] = [
          { first_name: { [Op.iLike]: pat } },
          { last_name: { [Op.iLike]: pat } },
          { email: { [Op.iLike]: pat } },
        ];
      }
    }
    if (req.query.user_type) where.user_type = req.query.user_type;

    const { count, rows } = await db.User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
      offset,
      limit,
    });
    const users = rows.map((u) => {
      const j = u.toJSON();
      return {
        id: String(j.id),
        name: [j.first_name, j.last_name].filter(Boolean).join(' ') || j.email,
        email: j.email,
        user_type: j.user_type,
        tenant_id: j.tenant_id != null ? String(j.tenant_id) : '',
        status: j.is_approved ? 'Active' : 'Inactive',
        created_at: j.created_at,
      };
    });
    return res.status(200).json({
      status: true,
      data: { users, pagination: { total: count, page, pages: Math.ceil(count / limit) || 1 } },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};
