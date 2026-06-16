/**
 * AlumniDetails column patches (idempotent).
 */
async function ensureAlumniDetailsSchema(sequelize) {
  if (sequelize.getDialect() !== 'postgres') return;

  try {
    await sequelize.query(`
      ALTER TABLE "AlumniDetails"
      ALTER COLUMN "work_experience" TYPE TEXT
      USING "work_experience"::text;
    `);
    console.info('[ensureAlumniDetailsSchema] work_experience → TEXT');
  } catch (e) {
    if (!/does not exist|already|duplicate/i.test(e.message)) {
      console.warn('[ensureAlumniDetailsSchema]', e.message);
    }
  }
}

module.exports = { ensureAlumniDetailsSchema };
