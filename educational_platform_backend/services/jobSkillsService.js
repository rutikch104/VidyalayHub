const db = require('../database/index');
const {
  normalizeSkillName,
  formatSkillDisplayName,
  findOrCreateSkill,
  SkillsServiceError,
} = require('./skillsService');

const MAX_JOB_SKILLS = 15;

function parseSkillsInput(raw) {
  if (raw === undefined) return null;
  if (raw === null || raw === '') return [];

  let arr = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      arr = Array.isArray(parsed) ? parsed : [trimmed];
    } catch {
      arr = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  if (!Array.isArray(arr)) return [];

  return arr
    .map((item) => {
      if (typeof item === 'string') {
        const name = item.trim();
        return name ? { skill_name: name } : null;
      }
      if (item && typeof item === 'object') {
        const skill_name = String(item.skill_name || item.name || '').trim();
        const skill_id = item.skill_id || item.id || null;
        if (!skill_name && !skill_id) return null;
        return { skill_id, skill_name: skill_name || undefined };
      }
      return null;
    })
    .filter(Boolean);
}

async function resolveSkillRecord(input, transaction) {
  if (input.skill_id) {
    const byId = await db.Skill.findByPk(input.skill_id, { transaction });
    if (byId) return byId;
  }
  if (input.skill_name) {
    return findOrCreateSkill(input.skill_name, transaction);
  }
  return null;
}

/**
 * Replace job skill links and sync denormalized skills_required on JobPosts.
 * @returns {string[]|null} canonical skill names, or null if skills were not updated
 */
async function syncJobSkills(jobId, rawInput, externalTransaction = null) {
  const inputs = parseSkillsInput(rawInput);
  if (inputs === null) return null;

  const run = async (transaction) => {
    if (inputs.length > MAX_JOB_SKILLS) {
      throw new SkillsServiceError(`Maximum ${MAX_JOB_SKILLS} skills allowed per job.`, 400, 'JOB_SKILLS_LIMIT');
    }

    const seen = new Set();
    const skills = [];

    for (const input of inputs) {
      const skill = await resolveSkillRecord(input, transaction);
      if (!skill) continue;

      const norm = skill.normalized_name || normalizeSkillName(skill.skill_name);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      skills.push(skill);
    }

    await db.JobSkill.destroy({ where: { job_id: jobId }, transaction });

    for (let i = 0; i < skills.length; i += 1) {
      await db.JobSkill.create(
        {
          job_id: jobId,
          skill_id: skills[i].id,
          sort_order: i,
        },
        { transaction },
      );
    }

    const names = skills.map((s) => s.skill_name);
    await db.JobPost.update(
      { skills_required: names, updated_at: new Date() },
      { where: { id: jobId }, transaction },
    );

    return names;
  };

  if (externalTransaction) return run(externalTransaction);
  return db.sequelize.transaction(run);
}

async function resolveSkillFilterNames(rawSkills) {
  const list = Array.isArray(rawSkills) ? rawSkills : [rawSkills];
  const names = [];

  for (const raw of list) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) continue;
    const norm = normalizeSkillName(trimmed);
    const found = await db.Skill.findOne({ where: { normalized_name: norm } });
    names.push(found ? found.skill_name : formatSkillDisplayName(trimmed));
  }

  return [...new Set(names)];
}

async function backfillJobSkillsFromPosts() {
  const jobs = await db.JobPost.findAll({
    attributes: ['id', 'skills_required'],
    where: { is_active: true },
  });

  for (const job of jobs) {
    const linked = await db.JobSkill.count({ where: { job_id: job.id } });
    if (linked > 0) continue;
    const skills = job.skills_required || [];
    if (!skills.length) continue;
    try {
      await syncJobSkills(job.id, skills);
    } catch (e) {
      console.warn('[jobSkillsService] backfill skipped job', job.id, e.message);
    }
  }
}

module.exports = {
  MAX_JOB_SKILLS,
  parseSkillsInput,
  syncJobSkills,
  resolveSkillFilterNames,
  backfillJobSkillsFromPosts,
};
