const { Op } = require('sequelize');
const db = require('../database/index');
const {
  normalizeSkillName,
  formatSkillDisplayName,
} = require('../database/ensureSkillsMasterSchema');

const MAX_SKILLS_PER_USER = 10;
const MIN_SUGGEST_QUERY_LEN = 1;
const MAX_SUGGEST_QUERY_LEN = 80;
const DEFAULT_SUGGEST_LIMIT = 10;
const MAX_SUGGEST_LIMIT = 20;
const MAX_SKILL_NAME_LEN = 120;

class SkillsServiceError extends Error {
  constructor(message, status = 400, code = 'SKILLS_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sanitizeSkillInput(name) {
  const trimmed = String(name || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  if (trimmed.length > MAX_SKILL_NAME_LEN) {
    return trimmed.slice(0, MAX_SKILL_NAME_LEN);
  }
  return trimmed;
}

function parseSkillLevel(level) {
  if (level === undefined || level === null || level === '') return null;
  const lvl = parseInt(String(level), 10);
  if (Number.isNaN(lvl)) return NaN;
  return lvl;
}

async function findSkillByNormalized(normalized, transaction) {
  if (!normalized) return null;
  return db.Skill.findOne({
    where: { normalized_name: normalized },
    transaction,
  });
}

async function findOrCreateSkill(rawName, transaction) {
  const sanitized = sanitizeSkillInput(rawName);
  if (!sanitized) {
    throw new SkillsServiceError('Skill name is required.');
  }
  const normalized = normalizeSkillName(sanitized);
  if (normalized.length < 2) {
    throw new SkillsServiceError('Skill name must be at least 2 characters.');
  }

  let skill = await findSkillByNormalized(normalized, transaction);
  if (skill) return skill;

  const skill_name = formatSkillDisplayName(sanitized);
  try {
    skill = await db.Skill.create(
      {
        skill_name,
        normalized_name: normalized,
        usage_count: 0,
        updated_at: new Date(),
      },
      { transaction },
    );
    return skill;
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return findSkillByNormalized(normalized, transaction);
    }
    throw e;
  }
}

async function getUserSkillIds(userId, transaction) {
  const rows = await db.UserSkill.findAll({
    where: { user_id: userId },
    attributes: ['skill_id'],
    transaction,
  });
  return rows.map((r) => r.skill_id).filter(Boolean);
}

async function userHasSkillNormalized(userId, normalized, transaction, excludeUserSkillId = null) {
  if (!normalized) return false;

  const where = { user_id: userId };
  if (excludeUserSkillId) where.id = { [Op.ne]: excludeUserSkillId };

  const rows = await db.UserSkill.findAll({
    where,
    attributes: ['id', 'skill_name'],
    include: [
      {
        model: db.Skill,
        as: 'skill',
        required: false,
        attributes: ['normalized_name'],
      },
    ],
    transaction,
  });

  return rows.some((r) => {
    const n = r.skill?.normalized_name || normalizeSkillName(r.skill_name);
    return n === normalized;
  });
}

async function countUserSkills(userId, transaction) {
  return db.UserSkill.count({ where: { user_id: userId }, transaction });
}

/**
 * Fast prefix search on normalized_name (indexed).
 */
async function searchSkillSuggestions(query, options = {}) {
  const { userId, limit = DEFAULT_SUGGEST_LIMIT, excludeIds = [] } = options;
  const normalized = normalizeSkillName(query);
  if (normalized.length < MIN_SUGGEST_QUERY_LEN) {
    return { items: [], canCreate: false, createLabel: null };
  }
  if (normalized.length > MAX_SUGGEST_QUERY_LEN) {
    return { items: [], canCreate: false, createLabel: null };
  }

  const cap = Math.min(Math.max(1, parseInt(String(limit), 10) || DEFAULT_SUGGEST_LIMIT), MAX_SUGGEST_LIMIT);

  let excludeSkillIds = [...excludeIds];
  if (userId) {
    const owned = await getUserSkillIds(userId);
    excludeSkillIds = [...new Set([...excludeSkillIds, ...owned])];
  }

  const where = {
    normalized_name: { [Op.like]: `${normalized}%` },
  };
  if (excludeSkillIds.length) {
    where.id = { [Op.notIn]: excludeSkillIds };
  }

  const rows = await db.Skill.findAll({
    where,
    attributes: ['id', 'skill_name', 'normalized_name', 'usage_count'],
    order: [
      ['usage_count', 'DESC'],
      ['skill_name', 'ASC'],
    ],
    limit: cap,
  });

  const exact = await findSkillByNormalized(normalized);
  const displayCreate = formatSkillDisplayName(query);
  const canCreate =
    displayCreate.length >= 2 &&
    !exact &&
    !(userId && (await userHasSkillNormalized(userId, normalized)));

  return {
    items: rows.map((s) => ({
      id: String(s.id),
      skill_name: s.skill_name,
      normalized_name: s.normalized_name,
      usage_count: s.usage_count,
    })),
    canCreate,
    createLabel: canCreate ? displayCreate : null,
    normalized_query: normalized,
  };
}

async function assignSkillToUser(userId, payload = {}) {
  const { skill_id: skillId, skill_name: skillName, level, sort_order: sortOrder } = payload;
  const lvl = parseSkillLevel(level);
  if (lvl != null && (Number.isNaN(lvl) || lvl < 0 || lvl > 10)) {
    throw new SkillsServiceError('level must be between 0 and 10.');
  }

  return db.sequelize.transaction(async (transaction) => {
    const count = await countUserSkills(userId, transaction);
    if (count >= MAX_SKILLS_PER_USER) {
      throw new SkillsServiceError('Maximum 10 skills allowed.', 400, 'SKILLS_LIMIT');
    }

    let skill;
    if (skillId) {
      skill = await db.Skill.findByPk(skillId, { transaction });
      if (!skill) throw new SkillsServiceError('Skill not found.', 404);
    } else {
      skill = await findOrCreateSkill(skillName, transaction);
    }

    const dup = await userHasSkillNormalized(userId, skill.normalized_name, transaction);
    if (dup) {
      throw new SkillsServiceError('You already have this skill on your profile.', 409, 'DUPLICATE_SKILL');
    }

    const row = await db.UserSkill.create(
      {
        user_id: userId,
        skill_id: skill.id,
        skill_name: skill.skill_name,
        level: lvl == null || Number.isNaN(lvl) ? null : lvl,
        sort_order: sortOrder != null ? parseInt(String(sortOrder), 10) || 0 : count,
        updated_at: new Date(),
      },
      { transaction },
    );

    await db.Skill.increment('usage_count', { by: 1, where: { id: skill.id }, transaction });

    return {
      id: String(row.id),
      name: skill.skill_name,
      skill_id: String(skill.id),
      level: row.level,
    };
  });
}

async function updateUserSkill(userId, userSkillId, payload = {}) {
  const row = await db.UserSkill.findOne({ where: { id: userSkillId, user_id: userId } });
  if (!row) throw new SkillsServiceError('Skill not found.', 404);

  const up = { updated_at: new Date() };
  const { skill_name: skillName, skill_id: skillId, level, sort_order: sortOrder } = payload;

  if (skillId !== undefined && skillId !== null && String(skillId) !== String(row.skill_id || '')) {
    throw new SkillsServiceError('Use skill_name to rename a skill entry.', 400);
  }

  if (skillName !== undefined) {
    const skill = await findOrCreateSkill(skillName);
    const dup = await userHasSkillNormalized(userId, skill.normalized_name, null, userSkillId);
    if (dup) throw new SkillsServiceError('You already have this skill on your profile.', 409);
    up.skill_id = skill.id;
    up.skill_name = skill.skill_name;
  }

  if (level !== undefined) {
    const lvl = parseSkillLevel(level);
    if (lvl !== null && (Number.isNaN(lvl) || lvl < 0 || lvl > 10)) {
      throw new SkillsServiceError('level must be between 0 and 10.');
    }
    up.level = lvl === null || Number.isNaN(lvl) ? null : lvl;
  }
  if (sortOrder !== undefined) up.sort_order = parseInt(String(sortOrder), 10) || 0;

  await row.update(up);
  return row;
}

async function removeUserSkill(userId, userSkillId) {
  const row = await db.UserSkill.findOne({ where: { id: userSkillId, user_id: userId } });
  if (!row) throw new SkillsServiceError('Skill not found.', 404);

  const skillId = row.skill_id;
  await row.destroy();

  if (skillId) {
    const remaining = await db.UserSkill.count({ where: { skill_id: skillId } });
    if (remaining === 0) {
      await db.Skill.update({ usage_count: 0, updated_at: new Date() }, { where: { id: skillId } });
    } else {
      await db.Skill.update(
        { usage_count: remaining, updated_at: new Date() },
        { where: { id: skillId } },
      );
    }
  }

  return true;
}

module.exports = {
  MAX_SKILLS_PER_USER,
  SkillsServiceError,
  normalizeSkillName,
  formatSkillDisplayName,
  sanitizeSkillInput,
  searchSkillSuggestions,
  assignSkillToUser,
  updateUserSkill,
  removeUserSkill,
  findOrCreateSkill,
  countUserSkills,
};
