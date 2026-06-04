const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/index');

const { getJwtSecret } = require('../utils/jwtSecret');

function publicSuperAdmin(row) {
  const s = row.toJSON ? row.toJSON() : row;
  return {
    id: String(s.id),
    email: s.email,
    first_name: s.first_name || '',
    last_name: s.last_name || '',
    name: [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email,
    phone_number: s.phone_number || '',
    access: Boolean(s.access),
    role_name: 'SUPER_ADMIN',
  };
}

function signSuperAdminToken(row) {
  const s = row.toJSON ? row.toJSON() : row;
  return jwt.sign(
    {
      id: String(s.id),
      email: s.email,
      first_name: s.first_name,
      last_name: s.last_name,
      role_name: 'SUPER_ADMIN',
      role: 'super_admin',
      user_type: 'staff',
      super_admin_owner: true,
    },
    getJwtSecret(),
    { expiresIn: '8h' }
  );
}

exports.login = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ status: false, message: 'Email and password are required.' });
    }

    const row = await db.superAdmin.findOne({ where: { email, access: true } });
    if (!row) {
      return res.status(401).json({ status: false, message: 'Invalid credentials.' });
    }
    const ok = await bcrypt.compare(password, row.password_hash || '');
    if (!ok) {
      return res.status(401).json({ status: false, message: 'Invalid credentials.' });
    }

    const token = signSuperAdminToken(row);
    return res.status(200).json({
      status: true,
      data: {
        token,
        user: publicSuperAdmin(row),
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message || 'Login failed.' });
  }
};

exports.me = async (req, res) => {
  try {
    const email = String(req.user?.email || '').trim().toLowerCase();
    if (!email) return res.status(401).json({ status: false, message: 'Unauthorized.' });
    const row = await db.superAdmin.findOne({ where: { email, access: true } });
    if (!row) return res.status(401).json({ status: false, message: 'Unauthorized.' });
    return res.status(200).json({ status: true, data: publicSuperAdmin(row) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message || 'Failed to load profile.' });
  }
};

exports.listOwners = async (req, res) => {
  try {
    const rows = await db.superAdmin.findAll({
      attributes: ['id', 'first_name', 'last_name', 'phone_number', 'email', 'access', 'created_at'],
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json({ status: true, data: { owners: rows } });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message || 'Failed to load super admins.' });
  }
};

exports.createOwner = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const first_name = String(req.body?.first_name || '').trim();
    const last_name = String(req.body?.last_name || '').trim() || null;
    const phone_number = String(req.body?.phone_number || '').trim() || null;

    if (!email || !password || !first_name) {
      return res.status(400).json({ status: false, message: 'first_name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ status: false, message: 'Password must be at least 6 characters.' });
    }

    const existing = await db.superAdmin.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ status: false, message: 'Super admin with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const row = await db.superAdmin.create({
      first_name,
      last_name,
      phone_number,
      email,
      password_hash,
      access: true,
    });
    return res.status(201).json({ status: true, data: publicSuperAdmin(row) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message || 'Failed to create super admin.' });
  }
};
