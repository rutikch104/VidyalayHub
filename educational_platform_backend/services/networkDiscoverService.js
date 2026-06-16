/**
 * Discover People — paginated user directory with search and filters.
 * Designed for large tenant populations (10k–100k+ eligible users).
 */
const { Op } = require('sequelize');
const db = require('../database/index');
const {
  normalizeSearchQuery,
  stripLikeMetacharacters,
  ilikeContainsPattern,
} = require('../utils/searchQuery');
const {
  getBlockedUserIds,
  enrichUsersForNetwork,
  NETWORK_USER_ATTRS,
} = require('../utils/networkHelpers');

const DISCOVER_USER_TYPES = ['student', 'alumni', 'teacher', 'staff'];
const INACTIVE_REGISTRATION = ['suspended', 'rejected'];

function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(String(query.page), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(query.limit), 10) || 30));
  return { page, limit, offset: (page - 1) * limit };
}

function pickFilter(query, ...keys) {
  for (const key of keys) {
    const val = query[key];
    if (val != null && String(val).trim()) return String(val).trim();
  }
  return '';
}

async function connectionStatusMap(viewerId, targetIds) {
  const map = new Map();
  if (!targetIds.length) return map;

  const rows = await db.Connection.findAll({
    where: {
      [Op.or]: [
        { sender_id: viewerId, receiver_id: { [Op.in]: targetIds } },
        { sender_id: { [Op.in]: targetIds }, receiver_id: viewerId },
      ],
    },
    attributes: ['id', 'sender_id', 'receiver_id', 'status'],
  });

  for (const row of rows) {
    const otherId =
      String(row.sender_id) === String(viewerId) ? row.receiver_id : row.sender_id;
    const terminal = ['declined', 'withdrawn', 'removed'];
    if (terminal.includes(row.status)) {
      map.set(String(otherId), { status: 'none', connection_id: row.id });
      continue;
    }
    if (row.status === 'accepted') {
      map.set(String(otherId), { status: 'connected', connection_id: row.id });
      continue;
    }
    if (row.status === 'pending') {
      map.set(String(otherId), {
        status: 'pending',
        connection_id: row.id,
        direction: String(row.sender_id) === String(viewerId) ? 'outgoing' : 'incoming',
      });
    }
  }
  return map;
}

function buildDiscoverIncludes(filters, searchPat) {
  const includes = [];
  const hasAcademicFilter = Boolean(
    filters.degree || filters.branch || filters.department || filters.academicYear || filters.batch,
  );
  const hasProfessionalFilter = Boolean(filters.company || filters.designation);
  const hasSkillFilter = Boolean(filters.skill);
  const hasSearch = Boolean(searchPat);

  if (hasAcademicFilter || hasProfessionalFilter || hasSearch) {
    includes.push({
      model: db.StudentDetail,
      as: 'studentDetails',
      attributes: [],
      required: false,
    });
    includes.push({
      model: db.TeacherDetail,
      as: 'teacherDetails',
      attributes: [],
      required: false,
    });
    includes.push({
      model: db.AlumniDetail,
      as: 'alumniDetails',
      attributes: [],
      required: false,
    });
  }

  if (hasSkillFilter || hasSearch) {
    includes.push({
      model: db.UserSkill,
      as: 'userSkills',
      attributes: [],
      required: hasSkillFilter,
      where: hasSkillFilter ? { skill_name: { [Op.iLike]: ilikeContainsPattern(filters.skill) } } : undefined,
    });
  }

  if (filters.tenantId || filters.college || hasSearch) {
    includes.push({
      model: db.Tenant,
      as: 'tenant',
      attributes: [],
      required: Boolean(filters.tenantId || filters.college),
      where: filters.tenantId
        ? { tenant_id: filters.tenantId }
        : filters.college
          ? {
              [Op.or]: [
                { name: { [Op.iLike]: ilikeContainsPattern(filters.college) } },
                { short_name: { [Op.iLike]: ilikeContainsPattern(filters.college) } },
              ],
            }
          : undefined,
    });
  }

  return includes;
}

function buildDiscoverWhere(viewerId, excludeIds, filters, searchPat) {
  const where = {
    id: { [Op.notIn]: [...excludeIds] },
    is_approved: true,
    registration_status: { [Op.notIn]: INACTIVE_REGISTRATION },
    user_type: { [Op.in]: DISCOVER_USER_TYPES },
  };

  if (filters.userType) where.user_type = filters.userType;
  if (filters.tenantId) where.tenant_id = filters.tenantId;

  const andClauses = [];

  if (searchPat) {
    andClauses.push({
      [Op.or]: [
        { first_name: { [Op.iLike]: searchPat } },
        { last_name: { [Op.iLike]: searchPat } },
        { bio: { [Op.iLike]: searchPat } },
        { location: { [Op.iLike]: searchPat } },
        { '$studentDetails.degree$': { [Op.iLike]: searchPat } },
        { '$studentDetails.stream$': { [Op.iLike]: searchPat } },
        { '$studentDetails.year$': { [Op.iLike]: searchPat } },
        { '$teacherDetails.department$': { [Op.iLike]: searchPat } },
        { '$teacherDetails.designation$': { [Op.iLike]: searchPat } },
        { '$alumniDetails.degree$': { [Op.iLike]: searchPat } },
        { '$alumniDetails.stream$': { [Op.iLike]: searchPat } },
        { '$alumniDetails.academic_batch$': { [Op.iLike]: searchPat } },
        { '$alumniDetails.company_name$': { [Op.iLike]: searchPat } },
        { '$alumniDetails.current_job_title$': { [Op.iLike]: searchPat } },
        { '$userSkills.skill_name$': { [Op.iLike]: searchPat } },
        { '$tenant.name$': { [Op.iLike]: searchPat } },
        { '$tenant.short_name$': { [Op.iLike]: searchPat } },
      ],
    });
  }

  if (filters.degree) {
    andClauses.push({
      [Op.or]: [
        { '$studentDetails.degree$': { [Op.iLike]: ilikeContainsPattern(filters.degree) } },
        { '$alumniDetails.degree$': { [Op.iLike]: ilikeContainsPattern(filters.degree) } },
      ],
    });
  }

  if (filters.branch) {
    andClauses.push({
      [Op.or]: [
        { '$studentDetails.stream$': { [Op.iLike]: ilikeContainsPattern(filters.branch) } },
        { '$alumniDetails.stream$': { [Op.iLike]: ilikeContainsPattern(filters.branch) } },
      ],
    });
  }

  if (filters.department) {
    andClauses.push({
      '$teacherDetails.department$': { [Op.iLike]: ilikeContainsPattern(filters.department) },
    });
  }

  if (filters.academicYear) {
    andClauses.push({
      '$studentDetails.year$': { [Op.iLike]: ilikeContainsPattern(filters.academicYear) },
    });
  }

  if (filters.batch) {
    andClauses.push({
      '$alumniDetails.academic_batch$': { [Op.iLike]: ilikeContainsPattern(filters.batch) },
    });
  }

  if (filters.company) {
    andClauses.push({
      '$alumniDetails.company_name$': { [Op.iLike]: ilikeContainsPattern(filters.company) },
    });
  }

  if (filters.designation) {
    andClauses.push({
      [Op.or]: [
        { '$teacherDetails.designation$': { [Op.iLike]: ilikeContainsPattern(filters.designation) } },
        { '$alumniDetails.current_job_title$': { [Op.iLike]: ilikeContainsPattern(filters.designation) } },
      ],
    });
  }

  if (andClauses.length) where[Op.and] = andClauses;
  return where;
}

async function discoverUsers(viewerId, viewerTenantId, query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const blocked = await getBlockedUserIds(viewerId);
  const excludeIds = new Set([String(viewerId), ...blocked]);

  const qRaw = query.q || query.search;
  const needle = normalizeSearchQuery(qRaw);
  const inner = stripLikeMetacharacters(needle);
  const searchPat = inner ? ilikeContainsPattern(inner) : null;

  const filters = {
    userType: pickFilter(query, 'user_type', 'role'),
    tenantId: pickFilter(query, 'tenant_id', 'college_id'),
    college: pickFilter(query, 'college', 'university', 'institution'),
    degree: pickFilter(query, 'degree'),
    branch: pickFilter(query, 'branch', 'stream'),
    department: pickFilter(query, 'department'),
    academicYear: pickFilter(query, 'academic_year', 'year'),
    batch: pickFilter(query, 'batch', 'academic_batch'),
    company: pickFilter(query, 'company'),
    designation: pickFilter(query, 'designation', 'position'),
    skill: pickFilter(query, 'skills', 'skill'),
  };

  const includes = buildDiscoverIncludes(filters, searchPat);
  const where = buildDiscoverWhere(viewerId, excludeIds, filters, searchPat);

  const tenantOrder =
    viewerTenantId != null && viewerTenantId !== ''
      ? [
          [
            db.sequelize.literal(
              `CASE WHEN "User"."tenant_id"::text = ${db.sequelize.escape(
                String(viewerTenantId),
              )} THEN 0 ELSE 1 END`,
            ),
            'ASC',
          ],
        ]
      : [];

  const { count, rows } = await db.User.findAndCountAll({
    where,
    attributes: NETWORK_USER_ATTRS,
    include: includes,
    distinct: true,
    subQuery: false,
    order: [...tenantOrder, ['updated_at', 'DESC'], ['first_name', 'ASC'], ['last_name', 'ASC']],
    limit,
    offset,
  });

  const enriched = await enrichUsersForNetwork(viewerId, rows);
  const statusMap = await connectionStatusMap(
    viewerId,
    enriched.map((u) => u.id),
  );

  const users = enriched.map((u) => ({
    ...u,
    connection_status: statusMap.get(String(u.id))?.status || 'none',
    connection_id: statusMap.get(String(u.id))?.connection_id || null,
    connection_direction: statusMap.get(String(u.id))?.direction || null,
  }));

  return {
    users,
    pagination: {
      total: count,
      page,
      pages: Math.ceil(count / limit) || 1,
      limit,
    },
  };
}

module.exports = {
  discoverUsers,
  DISCOVER_USER_TYPES,
  INACTIVE_REGISTRATION,
};
