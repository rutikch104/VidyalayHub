/**
 * Read-only — lists existing super_admins rows.
 * Run from backend dir:  node scripts/listSuperAdmins.js
 */
require('dotenv').config();
const path = require('path');
const db = require(path.join(__dirname, '..', 'database', 'index'));

async function main() {
  const rows = await db.superAdmin.findAll({
    attributes: ['id', 'first_name', 'last_name', 'email', 'phone_number', 'access', 'created_at'],
    order: [['created_at', 'ASC']],
  });

  if (!rows.length) {
    console.log('No super admins exist. Use createSuperAdminOwner.js to create one.');
  } else {
    console.log(`Found ${rows.length} super admin account(s):\n`);
    for (const r of rows) {
      const s = r.toJSON();
      const name = [s.first_name, s.last_name].filter(Boolean).join(' ') || '—';
      console.log(`  • ${s.email}`);
      console.log(`      name:   ${name}`);
      console.log(`      phone:  ${s.phone_number || '—'}`);
      console.log(`      access: ${s.access ? 'active' : 'disabled'}`);
      console.log(`      since:  ${s.created_at}\n`);
    }
  }

  await db.sequelize.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
