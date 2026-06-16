const db = require('../database/index');
const { Op } = require('sequelize');
const { discoverUsers } = require('../services/networkDiscoverService');
const {
  enrichUsersForNetwork,
  computeMutualConnectionCount,
  getAcceptedConnectionPeerIds,
  NETWORK_USER_ATTRS,
} = require('../utils/networkHelpers');

exports.discoverUsers = async (req, res) => {
  try {
    const data = await discoverUsers(req.user.id, req.user.tenant_id, req.query);
    return res.status(200).json({ status: true, data });
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
