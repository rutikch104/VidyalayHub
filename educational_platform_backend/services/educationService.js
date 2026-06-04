const db = require('../database/index');
const skillsService = require('./skillsService');

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MIN_YEAR = 1950;
const MAX_EDUCATION_SKILLS = 10;
const MAX_INSTITUTION_LEN = 500;
const MAX_DEGREE_LEN = 255;
const MAX_FIELD_LEN = 255;
const MAX_GRADE_LEN = 32;
const MAX_DESC_LEN = 2000;
const MAX_ACHIEVEMENTS_LEN = 1000;

class EducationServiceError extends Error {
  constructor(message, status = 400, code = 'EDUCATION_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function currentYear() {
  return new Date().getFullYear();
}

function parseIntField(value, fieldName, { min, max, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new EducationServiceError(`${fieldName} is required.`);
    return null;
  }
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n)) {
    throw new EducationServiceError(`${fieldName} must be a valid number.`);
  }
  if (min != null && n < min) throw new EducationServiceError(`${fieldName} is invalid.`);
  if (max != null && n > max) throw new EducationServiceError(`${fieldName} is invalid.`);
  return n;
}

function monthYearKey(year, month) {
  return year * 12 + month;
}

function formatMonthYear(month, year) {
  const idx = month - 1;
  if (idx < 0 || idx > 11 || !year) return '';
  return `${MONTH_SHORT[idx]} ${year}`;
}

function formatEducationDuration(row = {}) {
  const startMonth = row.start_month != null ? Number(row.start_month) : null;
  const startYear = row.start_year != null ? Number(row.start_year) : null;
  const endMonth = row.end_month != null ? Number(row.end_month) : null;
  const endYear = row.end_year != null ? Number(row.end_year) : null;
  const isCurrent = !!row.is_current_studying;

  if (startMonth && startYear) {
    const start = formatMonthYear(startMonth, startYear);
    if (isCurrent) return `${start} – Present`;
    if (endMonth && endYear) {
      return `${start} – ${formatMonthYear(endMonth, endYear)}`;
    }
    return start;
  }
  const legacy = row.duration != null ? String(row.duration).trim() : '';
  return legacy || null;
}

function formatGradeLine(row = {}) {
  const parts = [];
  const cgpa = row.cgpa != null ? String(row.cgpa).trim() : '';
  const pct = row.percentage != null ? String(row.percentage).trim() : '';
  if (cgpa) parts.push(`CGPA: ${cgpa}`);
  if (pct) {
    const p = pct.includes('%') ? pct : `${pct}%`;
    parts.push(`Grade: ${p}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

function hasStructuredDatesInRequest(body = {}) {
  return (
    body.start_month !== undefined
    || body.start_year !== undefined
    || body.end_month !== undefined
    || body.end_year !== undefined
    || body.is_current_studying !== undefined
  );
}

function rowHasStructuredDates(row = {}) {
  return !!(row.start_month && row.start_year);
}

function normalizeEducationPayload(body = {}) {
  const institution_name = String(body.institution_name || body.school || '').trim();
  if (!institution_name) {
    throw new EducationServiceError('Institution name is required.');
  }
  if (institution_name.length > MAX_INSTITUTION_LEN) {
    throw new EducationServiceError(`Institution name cannot exceed ${MAX_INSTITUTION_LEN} characters.`);
  }

  const degree = body.degree != null ? String(body.degree).trim().slice(0, MAX_DEGREE_LEN) || null : null;
  const field_of_study = body.field_of_study != null
    ? String(body.field_of_study).trim().slice(0, MAX_FIELD_LEN) || null
    : null;

  let description = body.description != null ? String(body.description).trim() || null : null;
  if (description && description.length > MAX_DESC_LEN) {
    description = description.slice(0, MAX_DESC_LEN);
  }

  let achievements = body.achievements != null ? String(body.achievements).trim() || null : null;
  if (achievements && achievements.length > MAX_ACHIEVEMENTS_LEN) {
    achievements = achievements.slice(0, MAX_ACHIEVEMENTS_LEN);
  }

  const cgpa = body.cgpa != null ? String(body.cgpa).trim().slice(0, MAX_GRADE_LEN) || null : null;
  const percentage = body.percentage != null
    ? String(body.percentage).trim().slice(0, MAX_GRADE_LEN) || null
    : null;

  const sort_order = body.sort_order != null ? parseInt(String(body.sort_order), 10) || 0 : 0;

  if (!hasStructuredDatesInRequest(body) && !rowHasStructuredDates(body)) {
    const duration = body.duration != null ? String(body.duration).trim() || null : null;
    return {
      institution_name,
      degree,
      field_of_study,
      description,
      achievements,
      cgpa,
      percentage,
      sort_order,
      duration,
      start_month: null,
      start_year: null,
      end_month: null,
      end_year: null,
      is_current_studying: false,
    };
  }

  const start_month = parseIntField(body.start_month, 'Start month', { min: 1, max: 12, required: true });
  const start_year = parseIntField(body.start_year, 'Start year', {
    min: MIN_YEAR,
    max: currentYear() + 6,
    required: true,
  });
  const is_current_studying = body.is_current_studying === true
    || body.is_current_studying === 'true'
    || body.is_current_studying === 1
    || body.is_current_studying === '1';

  let end_month = null;
  let end_year = null;
  if (!is_current_studying) {
    end_month = parseIntField(body.end_month, 'End month', { min: 1, max: 12, required: true });
    end_year = parseIntField(body.end_year, 'End year', {
      min: MIN_YEAR,
      max: currentYear() + 6,
      required: true,
    });
    if (monthYearKey(end_year, end_month) < monthYearKey(start_year, start_month)) {
      throw new EducationServiceError('End date cannot be earlier than start date.');
    }
  }

  const duration = formatEducationDuration({
    start_month,
    start_year,
    end_month,
    end_year,
    is_current_studying,
  });

  return {
    institution_name,
    degree,
    field_of_study,
    description,
    achievements,
    cgpa,
    percentage,
    sort_order,
    start_month,
    start_year,
    end_month,
    end_year,
    is_current_studying,
    duration,
  };
}

function normalizeSkillsInput(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const name = typeof item === 'string'
      ? item.trim()
      : String(item?.skill_name || item?.name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      skill_id: item?.skill_id || null,
      skill_name: name,
    });
    if (out.length >= MAX_EDUCATION_SKILLS) break;
  }
  return out;
}

async function replaceEducationSkills(educationId, skillsInput, transaction) {
  const skills = normalizeSkillsInput(skillsInput);
  await db.UserEducationSkill.destroy({ where: { education_id: educationId }, transaction });

  for (let i = 0; i < skills.length; i += 1) {
    const s = skills[i];
    let skillId = s.skill_id;
    if (!skillId) {
      const skill = await skillsService.findOrCreateSkill(s.skill_name, transaction);
      skillId = skill.id;
    }
    await db.UserEducationSkill.create(
      {
        education_id: educationId,
        skill_id: skillId,
        skill_name: s.skill_name,
        sort_order: i,
      },
      { transaction },
    );
  }
}

async function loadEducationSkills(educationIds) {
  if (!educationIds.length) return new Map();
  const rows = await db.UserEducationSkill.findAll({
    where: { education_id: educationIds },
    order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
  });
  const map = new Map();
  rows.forEach((r) => {
    const plain = r.get({ plain: true });
    const list = map.get(String(plain.education_id)) || [];
    list.push({
      id: String(plain.id),
      skill_id: plain.skill_id ? String(plain.skill_id) : null,
      name: plain.skill_name,
    });
    map.set(String(plain.education_id), list);
  });
  return map;
}

function mapEducationForApi(row, skillsMap = new Map()) {
  const plain = row && typeof row.get === 'function' ? row.get({ plain: true }) : row || {};
  const id = String(plain.id);
  const skillsFromInclude = plain.educationSkills;
  let skills = skillsMap.get(id) || [];
  if (skillsFromInclude && Array.isArray(skillsFromInclude)) {
    skills = skillsFromInclude.map((s) => {
      const x = s.get ? s.get({ plain: true }) : s;
      return {
        id: String(x.id),
        skill_id: x.skill_id ? String(x.skill_id) : null,
        name: x.skill_name,
      };
    });
  }

  const duration = formatEducationDuration(plain) || plain.duration || null;
  const grade_line = formatGradeLine(plain);

  return {
    id,
    institution_name: plain.institution_name,
    school: plain.institution_name,
    degree: plain.degree || null,
    field_of_study: plain.field_of_study || null,
    start_month: plain.start_month ?? null,
    start_year: plain.start_year ?? null,
    end_month: plain.end_month ?? null,
    end_year: plain.end_year ?? null,
    is_current_studying: !!plain.is_current_studying,
    duration,
    cgpa: plain.cgpa || null,
    percentage: plain.percentage || null,
    grade_line,
    description: plain.description || null,
    achievements: plain.achievements || null,
    skills,
    skill_names: skills.map((s) => s.name),
  };
}

function compareEducationRows(a, b) {
  const aKey = a.start_year && a.start_month
    ? monthYearKey(Number(a.start_year), Number(a.start_month))
    : 0;
  const bKey = b.start_year && b.start_month
    ? monthYearKey(Number(b.start_year), Number(b.start_month))
    : 0;
  if (bKey !== aKey) return bKey - aKey;
  return 0;
}

module.exports = {
  EducationServiceError,
  MAX_EDUCATION_SKILLS,
  formatEducationDuration,
  formatGradeLine,
  hasStructuredDatesInRequest,
  rowHasStructuredDates,
  normalizeEducationPayload,
  normalizeSkillsInput,
  replaceEducationSkills,
  loadEducationSkills,
  mapEducationForApi,
  compareEducationRows,
};
