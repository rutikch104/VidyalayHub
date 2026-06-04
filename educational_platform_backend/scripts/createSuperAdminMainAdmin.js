/**
 * Ensures a row in main_admins with role super_admin for the given email.
 * Super-admin API access matches JWT user email to this table (see middleware/superAdminAccess.js).
 *
 * From educational_platform_backend:
 *   SUPER_ADMIN_EMAIL=you@example.com node scripts/createSuperAdminMainAdmin.js
 *   node scripts/createSuperAdminMainAdmin.js you@example.com
 *
 * password_hash is required by the model but not used for that middleware path.
 */
require('dotenv').config();
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// eslint-disable-next-line import/no-dynamic-require
const db = require(path.join(__dirname, '..', 'database', 'index'));

function uniqueUsername(email) {
  const base = String(email)
    .toLowerCase()
    .replace(/@/g, '_at_')
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 40);
  return `${base || 'super'}_${crypto.randomBytes(4).toString('hex')}`;
}

async function main() {
  const raw = process.env.SUPER_ADMIN_EMAIL || process.argv[2] || '';
  const email = String(raw).toLowerCase().trim();
  if (!email || !email.includes('@')) {
    console.error('Set SUPER_ADMIN_EMAIL or pass email as first argument.');
    console.error('Example: SUPER_ADMIN_EMAIL=you@example.com node scripts/createSuperAdminMainAdmin.js');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(`bootstrap-${crypto.randomBytes(8).toString('hex')}`, 10);

  const existing = await db.mainAdmin.findOne({ where: { email } });
  if (existing) {
    await existing.update({
      role: 'super_admin',
      status: true,
      password_hash,
    });
    console.log('Updated main_admins: super_admin active for', email);
  } else {
    await db.mainAdmin.create({
      username: uniqueUsername(email),
      email,
      password_hash,
      role: 'super_admin',
      status: true,
    });
    console.log('Created main_admins: super_admin for', email);
  }

  await db.sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
