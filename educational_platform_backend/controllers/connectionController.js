const db = require('../database/index');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');
const { normalizeSearchQuery, stripLikeMetacharacters } = require('../utils/searchQuery');
const { mergeConnectionWhere, denyIfCrossTenant } = require('../utils/tenantScope');
const {
  assertPeerConnection,
  normalizeConnectionScope,
  tenantIdForCreate,
  loadUserTenant,
} = require('../utils/tenantHelpers');
const { assertSameTenant } = require('../utils/tenantScope');
const {
  getPrivacySettings,
  isBlockedBetween,
  enrichUsersForNetwork,
  getAcceptedConnectionPeerIds,
  loadSkillsForUsers,
  NETWORK_USER_ATTRS,
} = require('../utils/networkHelpers');

function respondIfCrossTenant(res, req, resource) {
  const denial = denyIfCrossTenant(req, resource?.tenant_id);
  if (!denial) return false;
  res.status(denial.status).json({ status: false, message: denial.message });
  return true;
}

/** Stable JSON for invitation list endpoints (pending / sent). */
function serializeConnectionRequest(row) {
  const j = row?.toJSON ? row.toJSON() : row;
  if (!j) return null;
  const sender = j.sender
    ? {
        id: j.sender.id,
        first_name: j.sender.first_name,
        last_name: j.sender.last_name,
        profile_picture: j.sender.profile_picture,
        user_type: j.sender.user_type,
        tenant_id: j.sender.tenant_id,
        bio: j.sender.bio || null,
        location: j.sender.location || null,
      }
    : null;
  const receiver = j.receiver
    ? {
        id: j.receiver.id,
        first_name: j.receiver.first_name,
        last_name: j.receiver.last_name,
        profile_picture: j.receiver.profile_picture,
        user_type: j.receiver.user_type,
        tenant_id: j.receiver.tenant_id,
        bio: j.receiver.bio || null,
        location: j.receiver.location || null,
      }
    : null;
  return {
    id: j.id,
    connection_id: j.id,
    message: j.message || null,
    status: j.status,
    sender_id: j.sender_id,
    receiver_id: j.receiver_id,
    created_at: j.created_at,
    requested_at: j.requested_at || j.created_at,
    sender,
    receiver,
  };
}

/** Attach full network profile fields to the relevant peer on each invitation row. */
async function enrichConnectionRequests(viewerId, rows, peerField) {
  const peers = rows.map((row) => row?.[peerField]).filter(Boolean);
  if (!peers.length) {
    return rows.map((row) => serializeConnectionRequest(row)).filter(Boolean);
  }

  const enrichedPeers = await enrichUsersForNetwork(viewerId, peers);
  const enrichedById = new Map(enrichedPeers.map((u) => [String(u.id), u]));

  return rows
    .map((row) => {
      const base = serializeConnectionRequest(row);
      if (!base) return null;
      const peer = base[peerField];
      if (!peer) return base;

      const enriched = enrichedById.get(String(peer.id));
      if (!enriched) return base;

      return {
        ...base,
        ...enriched,
        [peerField]: { ...peer, ...enriched },
      };
    })
    .filter(Boolean);
}

// Send a connection request
exports.sendConnectionRequest = async (req, res) => {
  const { receiver_id, message, scope: scopeRaw } = req.body;
  const sender_id = req.user.id;
  let scope = normalizeConnectionScope(scopeRaw);

  try {
    // Validate receiver
    if (sender_id === receiver_id) {
      return res.status(400).json({
        status: false,
        message: 'You cannot send a connection request to yourself.'
      });
    }

    // Check if receiver exists
    const receiver = await db.User.findByPk(receiver_id);
    if (!receiver || !receiver.is_approved) {
      return res.status(404).json({
        status: false,
        message: 'User not found.'
      });
    }

    if (await isBlockedBetween(sender_id, receiver_id)) {
      return res.status(403).json({
        status: false,
        message: 'Unable to send a connection request to this user.',
      });
    }

    const receiverPrivacy = getPrivacySettings(receiver);
    if (!receiverPrivacy.allow_connection_requests) {
      return res.status(403).json({
        status: false,
        message: 'This user is not accepting connection requests.',
      });
    }

    const sender = await loadUserTenant(sender_id);
    if (
      sender?.tenant_id &&
      receiver.tenant_id &&
      !assertSameTenant(sender.tenant_id, receiver.tenant_id)
    ) {
      scope = 'global';
    }

    const peerCheck = await assertPeerConnection(req, sender_id, receiver_id, { scope });
    if (!peerCheck.ok) {
      return res.status(peerCheck.status).json({ status: false, message: peerCheck.message });
    }

    const tenant_id = tenantIdForCreate(req);

    // Peer-pair lookup must not use mergeConnectionWhere alone (Op.or is a symbol key).
    const existingConnection = await db.Connection.findOne({
      where: {
        [Op.or]: [
          { sender_id, receiver_id },
          { sender_id: receiver_id, receiver_id: sender_id },
        ],
      },
    });

    if (existingConnection) {
      if (existingConnection.status === 'accepted') {
        return res.status(400).json({
          status: false,
          message: 'You are already connected with this user.'
        });
      }
      if (existingConnection.status === 'pending') {
        if (existingConnection.sender_id === sender_id) {
          return res.status(400).json({
            status: false,
            message: 'You have already sent a connection request to this user.'
          });
        }
        return res.status(400).json({
          status: false,
          message: 'This user has already sent you a connection request. Accept or decline it from Pending.'
        });
      }

      // Recycle terminal rows (declined / withdrawn / removed) into a new outbound request
      if (['declined', 'withdrawn', 'removed'].includes(existingConnection.status)) {
        await existingConnection.update({
          sender_id,
          receiver_id,
          tenant_id,
          scope,
          message: message || null,
          status: 'pending',
          responded_at: null,
          decline_reason: null
        });

        const allowNotify = await NotificationService.shouldSendNotification(
          receiver_id,
          'connection_request',
        );
        if (allowNotify) {
          await NotificationService.createProfessionalNotification(
            receiver_id,
            'connection_request',
            sender_id,
            existingConnection.id,
            { message: message || null },
          );
        }

        const connectionWithDetails = await db.Connection.findByPk(existingConnection.id, {
          include: [
            {
              model: db.User,
              as: 'sender',
              attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
            },
            {
              model: db.User,
              as: 'receiver',
              attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
            }
          ]
        });

        const recycled = connectionWithDetails?.toJSON
          ? connectionWithDetails.toJSON()
          : connectionWithDetails;
        return res.status(200).json({
          status: true,
          message: 'Connection request sent successfully.',
          data: {
            id: recycled?.id,
            connection_id: recycled?.id,
            status: recycled?.status || 'pending',
            sender_id: recycled?.sender_id,
            receiver_id: recycled?.receiver_id,
            message: recycled?.message,
          },
        });
      }
    }

    // Create connection request
    const connection = await db.Connection.create({
      sender_id,
      receiver_id,
      tenant_id,
      scope,
      message: message || null,
      status: 'pending',
    });

    const allowNotifyCreate = await NotificationService.shouldSendNotification(
      receiver_id,
      'connection_request',
    );
    if (allowNotifyCreate) {
      await NotificationService.createProfessionalNotification(
        receiver_id,
        'connection_request',
        sender_id,
        connection.id,
        { message: message || null },
      );
    }

    // Fetch connection with user details
    const connectionWithDetails = await db.Connection.findByPk(connection.id, {
      include: [
        {
          model: db.User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
        },
        {
          model: db.User,
          as: 'receiver',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
        }
      ]
    });

    const created = connectionWithDetails?.toJSON
      ? connectionWithDetails.toJSON()
      : connectionWithDetails;
    return res.status(201).json({
      status: true,
      message: 'Connection request sent successfully.',
      data: {
        id: created?.id,
        connection_id: created?.id,
        status: created?.status || 'pending',
        sender_id: created?.sender_id,
        receiver_id: created?.receiver_id,
        message: created?.message,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error sending connection request.',
      error: err.message
    });
  }
};

// Accept a connection request
exports.acceptConnectionRequest = async (req, res) => {
  const { connection_id } = req.params;
  const user_id = req.user.id;

  try {
    const connection = await db.Connection.findOne({
      where: mergeConnectionWhere(
        {
          id: connection_id,
          receiver_id: user_id,
          status: 'pending'
        },
        req.user,
      ),
    });

    if (!connection) {
      return res.status(404).json({
        status: false,
        message: 'Connection request not found or already processed.'
      });
    }
    if (respondIfCrossTenant(res, req, connection)) return;

    await connection.update({
      status: 'accepted',
      responded_at: new Date()
    });

    const allowAccept = await NotificationService.shouldSendNotification(
      connection.sender_id,
      'connection_request',
    );
    if (allowAccept) {
      await NotificationService.createProfessionalNotification(
        connection.sender_id,
        'connection_request',
        user_id,
        connection.id,
        { status: 'accepted' },
      );
    }

    // Fetch updated connection with details
    const updatedConnection = await db.Connection.findByPk(connection.id, {
      include: [
        {
          model: db.User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
        },
        {
          model: db.User,
          as: 'receiver',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
        }
      ]
    });

    return res.status(200).json({
      status: true,
      message: 'Connection request accepted successfully.',
      data: updatedConnection
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error accepting connection request.',
      error: err.message
    });
  }
};

// Decline a connection request
exports.declineConnectionRequest = async (req, res) => {
  const { connection_id } = req.params;
  const { reason } = req.body;
  const user_id = req.user.id;

  try {
    const connection = await db.Connection.findOne({
      where: mergeConnectionWhere(
        {
          id: connection_id,
          receiver_id: user_id,
          status: 'pending',
        },
        req.user,
      ),
    });

    if (!connection) {
      return res.status(404).json({
        status: false,
        message: 'Connection request not found or already processed.'
      });
    }
    if (respondIfCrossTenant(res, req, connection)) return;

    await connection.update({
      status: 'declined',
      responded_at: new Date(),
      decline_reason: reason || null
    });

    // Create notification for sender
    await NotificationService.createProfessionalNotification(
      connection.sender_id,
      'connection_request',
      user_id,
      connection.id,
      { status: 'declined', reason: reason || null }
    );

    return res.status(200).json({
      status: true,
      message: 'Connection request declined successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error declining connection request.',
      error: err.message
    });
  }
};

// Withdraw a connection request
exports.withdrawConnectionRequest = async (req, res) => {
  const { connection_id } = req.params;
  const user_id = req.user.id;

  try {
    const connection = await db.Connection.findOne({
      where: mergeConnectionWhere(
        {
          id: connection_id,
          sender_id: user_id,
          status: 'pending',
        },
        req.user,
      ),
    });

    if (!connection) {
      return res.status(404).json({
        status: false,
        message: 'Connection request not found or already processed.'
      });
    }
    if (respondIfCrossTenant(res, req, connection)) return;

    await connection.update({
      status: 'withdrawn',
      responded_at: new Date()
    });

    return res.status(200).json({
      status: true,
      message: 'Connection request withdrawn successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error withdrawing connection request.',
      error: err.message
    });
  }
};

// Remove a connection
exports.removeConnection = async (req, res) => {
  const { connection_id } = req.params;
  const user_id = req.user.id;

  try {
    const connection = await db.Connection.findOne({
      where: mergeConnectionWhere(
        {
          id: connection_id,
          status: 'accepted',
          [Op.or]: [{ sender_id: user_id }, { receiver_id: user_id }],
        },
        req.user,
      ),
    });

    if (!connection) {
      return res.status(404).json({
        status: false,
        message: 'Connection not found.'
      });
    }
    if (respondIfCrossTenant(res, req, connection)) return;

    await connection.update({
      status: 'removed',
      responded_at: new Date()
    });

    return res.status(200).json({
      status: true,
      message: 'Connection removed successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error removing connection.',
      error: err.message
    });
  }
};

// Status with another user (for profile / connect button)
exports.getConnectionStatusWithUser = async (req, res) => {
  const me = req.user.id;
  const { user_id: other_id } = req.params;

  try {
    if (!other_id || me === other_id) {
      return res.status(400).json({
        status: false,
        message: 'Invalid user.'
      });
    }

    const row = await db.Connection.findOne({
      where: {
        [Op.or]: [
          { sender_id: me, receiver_id: other_id },
          { sender_id: other_id, receiver_id: me },
        ],
      },
    });

    if (!row) {
      return res.status(200).json({
        status: true,
        data: { status: 'none', connection_id: null }
      });
    }

    const terminal = ['declined', 'withdrawn', 'removed'];
    if (terminal.includes(row.status)) {
      return res.status(200).json({
        status: true,
        data: { status: 'none', connection_id: row.id, last_status: row.status }
      });
    }

    if (row.status === 'accepted') {
      return res.status(200).json({
        status: true,
        data: { status: 'connected', connection_id: row.id }
      });
    }

    if (row.status === 'pending') {
      return res.status(200).json({
        status: true,
        data: {
          status: 'pending',
          connection_id: row.id,
          direction: row.sender_id === me ? 'outbound' : 'inbound'
        }
      });
    }

    return res.status(200).json({
      status: true,
      data: { status: 'none', connection_id: row.id }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error resolving connection status.',
      error: err.message
    });
  }
};

// Get pending connection requests
exports.getPendingRequests = async (req, res) => {
  const user_id = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  try {
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await db.Connection.findAndCountAll({
      where: mergeConnectionWhere(
        {
          receiver_id: user_id,
          status: 'pending'
        },
        req.user,
      ),
      include: [
        {
          model: db.User,
          as: 'sender',
          attributes: NETWORK_USER_ATTRS,
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: limitNum
    });

    const requests = await enrichConnectionRequests(user_id, rows, 'sender');

    return res.status(200).json({
      status: true,
      data: {
        requests,
        pagination: {
          total: count,
          page: pageNum,
          pages: Math.ceil(count / limitNum) || 1
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching pending connection requests.',
      error: err.message
    });
  }
};

// Get sent connection requests (defaults to pending only — "Sent" tab awaiting response)
exports.getSentRequests = async (req, res) => {
  const user_id = req.user.id;
  const { page = 1, limit = 10, status: statusParam } = req.query;

  try {
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const offset = (pageNum - 1) * limitNum;
    const where = { sender_id: user_id };

    // Default: only outstanding sent requests; pass ?status=all for history
    if (statusParam === 'all') {
      /* no status filter */
    } else if (statusParam) {
      where.status = statusParam;
    } else {
      where.status = 'pending';
    }

    const { count, rows } = await db.Connection.findAndCountAll({
      where: mergeConnectionWhere(where, req.user),
      include: [
        {
          model: db.User,
          as: 'receiver',
          attributes: NETWORK_USER_ATTRS,
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: limitNum
    });

    const requests = await enrichConnectionRequests(user_id, rows, 'receiver');

    return res.status(200).json({
      status: true,
      data: {
        requests,
        pagination: {
          total: count,
          page: pageNum,
          pages: Math.ceil(count / limitNum) || 1
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching sent connection requests.',
      error: err.message
    });
  }
};

// Get user's network (connections)
exports.getUserNetwork = async (req, res) => {
  const user_id = req.user.id;
  const { page = 1, limit = 20, search, user_type, tenant_id } = req.query;

  try {
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const offset = (pageNum - 1) * limitNum;

    // Get all accepted connections for the user
    const connections = await db.Connection.findAll({
      where: mergeConnectionWhere(
        {
          status: 'accepted',
          [Op.or]: [
            { sender_id: user_id },
            { receiver_id: user_id }
          ],
        },
        req.user,
      ),
      include: [
        {
          model: db.User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type', 'tenant_id']
        },
        {
          model: db.User,
          as: 'receiver',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type', 'tenant_id']
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    // One row per connected user (connection_id needed for remove / disconnect)
    const byUserId = new Map();
    for (const connection of connections) {
      const other = connection.sender_id === user_id ? connection.receiver : connection.sender;
      if (!other) continue;
      const j = other.toJSON ? other.toJSON() : other;
      const oid = String(j.id);
      if (byUserId.has(oid)) continue;
      byUserId.set(oid, {
        ...j,
        connection_id: connection.id
      });
    }

    let filteredUsers = Array.from(byUserId.values());
    if (search) {
      const inner = stripLikeMetacharacters(normalizeSearchQuery(search));
      if (inner) {
        const ql = inner.toLowerCase();
        filteredUsers = filteredUsers.filter((u) =>
          `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(ql)
        );
      }
    }
    if (user_type) {
      filteredUsers = filteredUsers.filter((u) => u.user_type === user_type);
    }
    if (tenant_id) {
      filteredUsers = filteredUsers.filter((u) => String(u.tenant_id || '') === String(tenant_id));
    }

    const total = filteredUsers.length;
    const paginatedUsers = filteredUsers.slice(offset, offset + limitNum);
    const enriched = await enrichUsersForNetwork(user_id, paginatedUsers);
    const withMeta = enriched.map((u) => ({
      ...u,
      connection_id: paginatedUsers.find((p) => String(p.id) === String(u.id))?.connection_id,
    }));

    return res.status(200).json({
      status: true,
      data: {
        connections: withMeta,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching user network.',
      error: err.message
    });
  }
};

const { getNetworkSuggestions } = require('../services/networkRecommendationService');

// Get network suggestions (people you may know) — relationship-aware scoring
exports.getNetworkSuggestions = async (req, res) => {
  const user_id = req.user.id;

  try {
    const data = await getNetworkSuggestions(user_id, req.query);

    return res.status(200).json({
      status: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching network suggestions.',
      error: err.message,
    });
  }
};

// Get connection statistics
exports.getConnectionStats = async (req, res) => {
  const user_id = req.user.id;

  try {
    const stats = await db.Connection.findAll({
      where: mergeConnectionWhere(
        {
          [Op.or]: [
            { sender_id: user_id },
            { receiver_id: user_id },
          ],
        },
        req.user,
      ),
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const connectionStats = {
      total: 0,
      accepted: 0,
      pending_received: 0,
      pending_sent: 0,
      declined: 0,
      withdrawn: 0,
      removed: 0
    };

    stats.forEach(stat => {
      const count = parseInt(stat.dataValues.count);
      const status = stat.status;
      connectionStats.total += count;
      
      if (status === 'accepted') {
        connectionStats.accepted = count;
      } else if (status === 'pending') {
        // Need to check if user is sender or receiver
        // This is a simplified version
        connectionStats.pending_received += count;
      } else if (connectionStats.hasOwnProperty(status)) {
        connectionStats[status] = count;
      }
    });

    // Get more accurate pending counts
    const pendingReceived = await db.Connection.count({
      where: mergeConnectionWhere({ receiver_id: user_id, status: 'pending' }, req.user),
    });
    const pendingSent = await db.Connection.count({
      where: mergeConnectionWhere({ sender_id: user_id, status: 'pending' }, req.user),
    });

    connectionStats.pending_received = pendingReceived;
    connectionStats.pending_sent = pendingSent;

    return res.status(200).json({
      status: true,
      data: connectionStats
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching connection statistics.',
      error: err.message
    });
  }
};

// Block a user
exports.blockUser = async (req, res) => {
  const blocked_user_id = req.body.user_id || req.body.blocked_user_id;
  const blocker_id = req.user.id;

  try {
    if (!blocked_user_id) {
      return res.status(400).json({
        status: false,
        message: 'user_id (or blocked_user_id) is required.'
      });
    }

    if (blocker_id === blocked_user_id) {
      return res.status(400).json({
        status: false,
        message: 'You cannot block yourself.'
      });
    }

    // Check if already blocked
    const existingBlock = await db.UserBlock.findOne({
      where: { blocker_id, blocked_user_id }
    });

    if (existingBlock) {
      return res.status(400).json({
        status: false,
        message: 'User is already blocked.'
      });
    }

    // Create block
    await db.UserBlock.create({
      blocker_id,
      blocked_user_id
    });

    // Remove any existing connections
    await db.Connection.update(
      { status: 'removed' },
      {
        where: {
          [Op.or]: [
            { sender_id: blocker_id, receiver_id: blocked_user_id },
            { sender_id: blocked_user_id, receiver_id: blocker_id }
          ],
          status: { [Op.in]: ['pending', 'accepted'] }
        }
      }
    );

    return res.status(200).json({
      status: true,
      message: 'User blocked successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error blocking user.',
      error: err.message
    });
  }
};

// Unblock a user
exports.unblockUser = async (req, res) => {
  const { user_id: blocked_user_id } = req.params;
  const blocker_id = req.user.id;

  try {
    const block = await db.UserBlock.findOne({
      where: { blocker_id, blocked_user_id }
    });

    if (!block) {
      return res.status(404).json({
        status: false,
        message: 'User is not blocked.'
      });
    }

    await block.destroy();

    return res.status(200).json({
      status: true,
      message: 'User unblocked successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error unblocking user.',
      error: err.message
    });
  }
};

// Get blocked users
exports.getBlockedUsers = async (req, res) => {
  const user_id = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  try {
    const offset = (page - 1) * limit;

    const { count, rows } = await db.UserBlock.findAndCountAll({
      where: { blocker_id: user_id },
      include: [
        {
          model: db.User,
          as: 'blockedUser',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: parseInt(limit)
    });

    return res.status(200).json({
      status: true,
      data: {
        blocked_users: rows.map(row => row.blockedUser),
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching blocked users.',
      error: err.message
    });
  }
};
