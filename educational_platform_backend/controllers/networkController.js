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
  computeMutualConnectionCount,
  getAcceptedConnectionPeerIds,
  NETWORK_USER_ATTRS,
} = require('../utils/networkHelpers');

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

exports.discoverUsers = async (req, res) => {
  try {
    const qRaw = req.query.q || req.query.search;
    const needle = normalizeSearchQuery(qRaw);
    const inner = stripLikeMetacharacters(needle);
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const offset = (page - 1) * limit;
    const viewerId = req.user.id;

    if (!inner) {
      return res.status(200).json({
        status: true,
        data: {
          users: [],
          pagination: { total: 0, page, pages: 1, limit },
        },
      });
    }

    const pat = ilikeContainsPattern(inner);
    if (!pat) {
      return res.status(200).json({
        status: true,
        data: {
          users: [],
          pagination: { total: 0, page, pages: 1, limit },
        },
      });
    }

    const blocked = await getBlockedUserIds(viewerId);
    const excludeIds = new Set([String(viewerId), ...blocked]);

    const where = {
      id: { [Op.notIn]: [...excludeIds] },
      is_approved: true,
      [Op.or]: [
        { first_name: { [Op.iLike]: pat } },
        { last_name: { [Op.iLike]: pat } },
        { bio: { [Op.iLike]: pat } },
        { location: { [Op.iLike]: pat } },
      ],
    };

    if (req.query.user_type || req.query.role) {
      where.user_type = String(req.query.user_type || req.query.role);
    }
    if (req.query.tenant_id) {
      where.tenant_id = String(req.query.tenant_id);
    }

    const skillsFilter = (req.query.skills || req.query.skill || '').trim();
    const include = [];
    if (skillsFilter) {
      const skillPat = ilikeContainsPattern(stripLikeMetacharacters(skillsFilter));
      if (skillPat) {
        include.push({
          model: db.UserSkill,
          as: 'userSkills',
          attributes: [],
          required: true,
          where: { skill_name: { [Op.iLike]: skillPat } },
        });
      }
    }

    const tenantOrder =
      req.user.tenant_id != null && req.user.tenant_id !== ''
        ? [
            [
              db.sequelize.literal(
                `CASE WHEN "User"."tenant_id"::text = ${db.sequelize.escape(
                  String(req.user.tenant_id),
                )} THEN 0 ELSE 1 END`,
              ),
              'ASC',
            ],
          ]
        : [];

    const { count, rows } = await db.User.findAndCountAll({
      where,
      attributes: NETWORK_USER_ATTRS,
      include,
      distinct: true,
      order: [...tenantOrder, ['first_name', 'ASC'], ['last_name', 'ASC']],
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

    return res.status(200).json({
      status: true,
      data: {
        users,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit) || 1,
          limit,
        },
      },
    });
  } catch (err) {
    console.error('discoverUsers', err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.getMutualConnections = async (req, res) => {
  const viewerId = req.user.id;
  const targetId = req.params.user_id;
  const { page = 1, limit = 20 } = req.query;

  try {
    if (String(viewerId) === String(targetId)) {
      return res.status(400).json({ status: false, message: 'Invalid target user.' });
    }

    const [viewerPeers, targetPeers] = await Promise.all([
      getAcceptedConnectionPeerIds(viewerId),
      getAcceptedConnectionPeerIds(targetId),
    ]);

    const mutualIds = [];
    for (const id of viewerPeers) {
      if (targetPeers.has(String(id))) mutualIds.push(id);
    }

    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const offset = (pageNum - 1) * limitNum;
    const slice = mutualIds.slice(offset, offset + limitNum);

    let users = [];
    if (slice.length) {
      const rows = await db.User.findAll({
        where: { id: { [Op.in]: slice }, is_approved: true },
        attributes: NETWORK_USER_ATTRS,
      });
      users = await enrichUsersForNetwork(viewerId, rows, { includeMutual: false });
    }

    const totalMutual = await computeMutualConnectionCount(viewerId, targetId);

    return res.status(200).json({
      status: true,
      data: {
        users,
        mutual_count: totalMutual,
        pagination: {
          total: mutualIds.length,
          page: pageNum,
          pages: Math.ceil(mutualIds.length / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching mutual connections.',
      error: err.message,
    });
  }
};
