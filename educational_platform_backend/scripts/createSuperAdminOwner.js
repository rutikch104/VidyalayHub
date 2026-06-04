/**
 * Create/update an owner row in super_admins.
 *
 * Usage:
 *   SUPER_ADMIN_EMAIL=owner@example.com SUPER_ADMIN_PASSWORD=secret123 SUPER_ADMIN_FIRST_NAME=Owner node scripts/createSuperAdminOwner.js
 *   node scripts/createSuperAdminOwner.js owner@example.com "Owner" "Lastname" "9999999999" "secret123"
 */
require('dotenv').config();
const path = require('path');
const bcrypt = require('bcrypt');
const db = require(path.join(__dirname, '..', 'database', 'index'));

async function main() {
  const email = String(process.env.SUPER_ADMIN_EMAIL || process.argv[2] || '').trim().toLowerCase();
  const firstName = String(process.env.SUPER_ADMIN_FIRST_NAME || process.argv[3] || 'Super').trim();
  const lastName = String(process.env.SUPER_ADMIN_LAST_NAME || process.argv[4] || 'Admin').trim();
  const phone = String(process.env.SUPER_ADMIN_PHONE || process.argv[5] || '').trim() || null;
  const password = String(process.env.SUPER_ADMIN_PASSWORD || process.argv[6] || '').trim();

  if (!email || !email.includes('@')) {
    console.error('Valid email is required.');
    process.exit(1);
  }
  if (!password || password.length < 6) {
    console.error('Password is required and must be at least 6 characters.');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);

  const existing = await db.superAdmin.findOne({ where: { email } });
  if (existing) {
    await existing.update({
      first_name: firstName || existing.first_name,
      last_name: lastName || existing.last_name,
      phone_number: phone,
      password_hash,
      access: true,
    });
    console.log('Updated super_admins owner:', email);
  } else {
    await db.superAdmin.create({
      first_name: firstName || 'Super',
      last_name: lastName || 'Admin',
      phone_number: phone,
      email,
      password_hash,
      access: true,
    });
    console.log('Created super_admins owner:', email);
  }

  await db.sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
