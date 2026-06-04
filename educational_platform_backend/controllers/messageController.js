const db = require('../database/index');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');
const { denyIfCrossTenant, mergeTenantWhere } = require('../utils/tenantScope');
const { assertDirectMessagePeers, tenantIdForCreate } = require('../utils/tenantHelpers');
const { descriptorFromMulterFile } = require('../services/mediaUploadService');
const { recordMediaAsset } = require('../services/mediaAssetService');

function plainRow(row) {
  if (!row) return null;
  if (typeof row.toJSON === 'function') return row.toJSON();
  if (typeof row.get === 'function') return row.get({ plain: true });
  return { ...row };
}

function formatUser(u) {
  if (!u) return { id: '', name: 'User', avatar_url: undefined };
  const p = plainRow(u);
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || 'User';
  return {
    id: String(p.id),
    name,
    avatar_url: p.profile_picture || p.avatar_url || undefined,
  };
}

function formatMessagePayload(m) {
  if (!m) return null;
  const p = plainRow(m);
  const replyRaw = p.replyTo || p.reply_to_message;
  let reply_to_message;
  if (replyRaw) {
    const r = plainRow(replyRaw);
    reply_to_message = {
      id: r.id,
      thread_id: r.thread_id,
      sender_id: String(r.sender_id),
      message: r.message,
      message_type: r.message_type,
      media_url: r.media_url,
      created_at: r.created_at,
      sender: formatUser(r.sender),
    };
  }
  const { replyTo, sender, ...rest } = p;
  return {
    ...rest,
    sender_id: String(rest.sender_id),
    sender: formatUser(sender),
    reply_to_message,
  };
}

function formatThreadParticipant(pt) {
  const p = plainRow(pt);
  return {
    ...p,
    user_id: String(p.user_id),
    user: formatUser(p.user),
  };
}

function formatThreadPayload(thread) {
  if (!thread) return null;
  const p = plainRow(thread);
  const msgs = p.messages || [];
  const last_message = msgs[0] ? formatMessagePayload(msgs[0]) : undefined;
  const { messages: _drop, ...rest } = p;
  return {
    ...rest,
    participants: (p.participants || []).map(formatThreadParticipant),
    last_message,
  };
}

const participantUserInclude = {
  model: db.User,
  as: 'user',
  attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'email'],
};

async function findDirectThreadBetween(user1_id, user2_id) {
  const u1 = String(user1_id);
  const u2 = String(user2_id);
  const rows = await db.MessageThreadParticipant.findAll({
    where: { user_id: user1_id, is_active: true },
    attributes: ['thread_id'],
    raw: true,
  });
  const threadIds = [...new Set(rows.map((r) => r.thread_id))];
  for (const tid of threadIds) {
    const cand = await db.MessageThread.findOne({
      where: { id: tid, thread_type: 'direct', is_active: true },
      include: [
        {
          model: db.MessageThreadParticipant,
          as: 'participants',
          where: { is_active: true },
          required: true,
          include: [participantUserInclude],
        },
      ],
    });
    if (!cand) continue;
    const ids = new Set(cand.participants.map((part) => String(part.user_id)));
    if (ids.size === 2 && ids.has(u1) && ids.has(u2)) {
      return cand;
    }
  }
  return null;
}

async function loadThreadForResponse(threadId) {
  return db.MessageThread.findByPk(threadId, {
    include: [
      {
        model: db.MessageThreadParticipant,
        as: 'participants',
        include: [participantUserInclude],
      },
      {
        model: db.Message,
        as: 'messages',
        limit: 1,
        order: [['created_at', 'DESC']],
        where: { is_deleted: false },
        include: [
          {
            model: db.User,
            as: 'sender',
            attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'email'],
          },
        ],
      },
    ],
  });
}

/** Shared thread list for GET /messages/threads and GET /messages/conversations */
async function fetchThreadsPageForUser(user_id, query, req) {
  const { page = 1, limit = 20 } = query;
  const pageNum = parseInt(String(page), 10) || 1;
  const limitNum = parseInt(String(limit), 10) || 20;
  const offset = (pageNum - 1) * limitNum;
  const threadWhere = { is_active: true };
  const { shouldApplyTenantScope, tenantIdWhere, defaultTenantScopeOptions } = require('../utils/tenantScope');
  if (req && shouldApplyTenantScope(req.user)) {
    Object.assign(
      threadWhere,
      tenantIdWhere(req.user.tenant_id, defaultTenantScopeOptions()),
    );
  }

  const count = await db.MessageThreadParticipant.count({
    where: { user_id, is_active: true },
    include: [
      {
        model: db.MessageThread,
        as: 'thread',
        where: threadWhere,
        required: true,
      },
    ],
  });

  const rows = await db.MessageThreadParticipant.findAll({
    where: { user_id, is_active: true },
    include: [
      {
        model: db.MessageThread,
        as: 'thread',
        where: threadWhere,
        required: true,
        include: [
          {
            model: db.MessageThreadParticipant,
            as: 'participants',
            include: [participantUserInclude],
          },
          {
            model: db.Message,
            as: 'messages',
            limit: 1,
            order: [['created_at', 'DESC']],
            separate: true,
            where: { is_deleted: false },
            include: [
              {
                model: db.User,
                as: 'sender',
                attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'email'],
              },
            ],
          },
        ],
      },
    ],
    order: [
      [db.sequelize.literal('"thread"."last_message_at" DESC NULLS LAST')],
      [db.sequelize.literal('"thread"."updated_at" DESC')],
    ],
    subQuery: false,
    offset,
    limit: limitNum,
  });

  const pages = Math.ceil(count / limitNum) || 1;
  const threads = rows
    .map((row) => formatThreadPayload(row.thread))
    .filter(Boolean);
  return {
    threads,
    pagination: {
      total: count,
      page: pageNum,
      pages,
      totalPages: pages,
    },
    total: count,
    page: pageNum,
    totalPages: pages,
  };
}

/**
 * Load paginated messages for a thread if user is a participant.
 * Marks incoming messages as read for this user (same as GET …/threads/:id/messages).
 */
async function fetchPagedMessagesForThread(thread_id, user_id, query, req) {
  const participant = await db.MessageThreadParticipant.findOne({
    where: { thread_id, user_id, is_active: true },
  });
  if (!participant) {
    return { error: { status: 403, message: 'Access denied. You are not part of this conversation.' } };
  }

  if (req) {
    const threadRow = await db.MessageThread.findByPk(thread_id, { attributes: ['id', 'tenant_id'] });
    const denial = denyIfCrossTenant(req, threadRow?.tenant_id);
    if (denial) return { error: denial };
  }

  const { page = 1, limit = 50 } = query;
  const pageNum = parseInt(String(page), 10) || 1;
  const limitNum = parseInt(String(limit), 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await db.Message.findAndCountAll({
    where: {
      thread_id,
      is_deleted: false,
    },
    include: [
      {
        model: db.User,
        as: 'sender',
        attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'email'],
      },
      {
        model: db.Message,
        as: 'replyTo',
        include: [{
          model: db.User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'email'],
        }],
      },
    ],
    order: [['created_at', 'ASC']],
    offset,
    limit: limitNum,
  });

  await db.Message.update(
    { is_read: true, read_at: new Date() },
    { where: { thread_id, receiver_id: user_id, is_read: false } },
  );

  await db.MessageThreadParticipant.update(
    { unread_count: 0 },
    { where: { thread_id, user_id } },
  );

  const pages = Math.ceil(count / limitNum) || 1;
  return {
    messages: rows.map(formatMessagePayload),
    pagination: {
      total: count,
      page: pageNum,
      pages,
      totalPages: pages,
    },
    total: count,
    page: pageNum,
    totalPages: pages,
  };
}

// Create or get direct message thread between two users
exports.getOrCreateDirectThread = async (req, res) => {
  const { user2_id, scope: scopeRaw } = req.body;
  const user1_id = req.user.id;

  try {
    if (!user2_id || String(user2_id) === String(user1_id)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid recipient.',
      });
    }

    const peerCheck = await assertDirectMessagePeers(req, user1_id, user2_id, { scope: scopeRaw });
    if (!peerCheck.ok) {
      return res.status(peerCheck.status).json({ status: false, message: peerCheck.message });
    }

    const tenant_id = tenantIdForCreate(req);
    let thread = await findDirectThreadBetween(user1_id, user2_id);

    if (!thread) {
      await db.sequelize.transaction(async (t) => {
        const newThread = await db.MessageThread.create(
          {
            thread_type: 'direct',
            created_by: user1_id,
            tenant_id,
          },
          { transaction: t }
        );
        await db.MessageThreadParticipant.bulkCreate(
          [
            { thread_id: newThread.id, user_id: user1_id, role: 'admin' },
            { thread_id: newThread.id, user_id: user2_id, role: 'member' },
          ],
          { transaction: t }
        );
        thread = newThread;
      });
    }

    const threadWithDetails = await loadThreadForResponse(thread.id);

    return res.status(200).json({
      status: true,
      data: formatThreadPayload(threadWithDetails),
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error creating/fetching message thread.',
      error: err.message,
    });
  }
};

// Create a group chat
exports.createGroupThread = async (req, res) => {
  const { name, description, avatar_url, participant_ids } = req.body;
  const created_by = req.user.id;

  try {
    if (!participant_ids || participant_ids.length < 2) {
      return res.status(400).json({
        status: false,
        message: 'Group must have at least 2 participants.'
      });
    }

    const ids = [...participant_ids];
    if (!ids.map(String).includes(String(created_by))) {
      ids.push(created_by);
    }

    const result = await db.sequelize.transaction(async (t) => {
      // Create group thread
      const thread = await db.MessageThread.create({
        thread_type: 'group',
        name,
        description,
        avatar_url,
        tenant_id: tenantIdForCreate(req),
        created_by
      }, { transaction: t });

      // Add all participants
      const participants = ids.map((user_id) => ({
        thread_id: thread.id,
        user_id,
        role: String(user_id) === String(created_by) ? 'admin' : 'member',
      }));

      await db.MessageThreadParticipant.bulkCreate(participants, { transaction: t });

      return thread;
    });

    // Fetch thread with participants
    const threadWithDetails = await db.MessageThread.findByPk(result.id, {
      include: [
        {
          model: db.MessageThreadParticipant,
          as: 'participants',
          include: [participantUserInclude],
        },
      ],
    });

    return res.status(201).json({
      status: true,
      message: 'Group chat created successfully.',
      data: formatThreadPayload(threadWithDetails),
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error creating group chat.',
      error: err.message
    });
  }
};

// Get all message threads for a user
exports.getUserThreads = async (req, res) => {
  const user_id = req.user.id;
  try {
    const data = await fetchThreadsPageForUser(user_id, req.query, req);
    return res.status(200).json({
      status: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching message threads.',
      error: err.message
    });
  }
};

/** GET /messages/conversations — same as thread list with `conversations` alias */
exports.getConversations = async (req, res) => {
  const user_id = req.user.id;
  try {
    const data = await fetchThreadsPageForUser(user_id, req.query, req);
    return res.status(200).json({
      status: true,
      data: {
        ...data,
        conversations: data.threads,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching conversations.',
      error: err.message,
    });
  }
};

// Get messages for a specific thread
exports.getThreadMessages = async (req, res) => {
  const { thread_id } = req.params;
  const user_id = req.user.id;

  try {
    const result = await fetchPagedMessagesForThread(thread_id, user_id, req.query, req);
    if (result.error) {
      return res.status(result.error.status).json({
        status: false,
        message: result.error.message,
      });
    }
    return res.status(200).json({
      status: true,
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching messages.',
      error: err.message
    });
  }
};

/**
 * GET /messages/:userId — messages between the current user and another user (direct thread only).
 */
exports.getConversationWithUser = async (req, res) => {
  const me = req.user.id;
  const { userId } = req.params;

  try {
    if (!userId || String(userId) === String(me)) {
      return res.status(400).json({ status: false, message: 'Invalid user id.' });
    }

    const other = await db.User.findByPk(userId, { attributes: ['id'] });
    if (!other) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }

    const thread = await findDirectThreadBetween(me, userId);
    if (!thread) {
      return res.status(200).json({
        status: true,
        data: {
          thread: null,
          other_user_id: String(userId),
          messages: [],
          pagination: { total: 0, page: 1, pages: 1, totalPages: 1 },
        },
      });
    }

    const result = await fetchPagedMessagesForThread(thread.id, me, req.query, req);
    if (result.error) {
      return res.status(result.error.status).json({ status: false, message: result.error.message });
    }

    const threadWithDetails = await loadThreadForResponse(thread.id);

    return res.status(200).json({
      status: true,
      data: {
        thread: formatThreadPayload(threadWithDetails),
        other_user_id: String(userId),
        ...result,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching conversation.',
      error: err.message,
    });
  }
};

/**
 * POST /messages — JSON body: { recipient_id | receiver_id | user_id, content | message }
 * Creates direct thread if needed, then stores the message.
 */
exports.sendDirectMessage = async (req, res) => {
  const sender_id = req.user.id;
  const recipient_id = req.body.recipient_id || req.body.receiver_id || req.body.user_id;
  const textRaw = req.body.content != null ? req.body.content : req.body.message;
  const text = String(textRaw || '').trim();

  try {
    if (!recipient_id || String(recipient_id) === String(sender_id)) {
      return res.status(400).json({ status: false, message: 'Invalid recipient.' });
    }
    if (!text) {
      return res.status(400).json({ status: false, message: 'Message cannot be empty.' });
    }

    const recipientUser = await db.User.findByPk(recipient_id, { attributes: ['id'] });
    if (!recipientUser) {
      return res.status(404).json({ status: false, message: 'Recipient not found.' });
    }

    const peerCheck = await assertDirectMessagePeers(req, sender_id, recipient_id);
    if (!peerCheck.ok) {
      return res.status(peerCheck.status).json({ status: false, message: peerCheck.message });
    }

    const tenant_id = tenantIdForCreate(req);
    let thread = await findDirectThreadBetween(sender_id, recipient_id);
    if (!thread) {
      await db.sequelize.transaction(async (t) => {
        const newThread = await db.MessageThread.create(
          { thread_type: 'direct', created_by: sender_id, tenant_id },
          { transaction: t },
        );
        await db.MessageThreadParticipant.bulkCreate(
          [
            { thread_id: newThread.id, user_id: sender_id, role: 'admin' },
            { thread_id: newThread.id, user_id: recipient_id, role: 'member' },
          ],
          { transaction: t },
        );
        thread = newThread;
      });
    }

    const thread_id = thread.id;
    const reply_to_message_id = req.body.reply_to_message_id || null;

    const result = await db.sequelize.transaction(async (t) => {
      const newMessage = await db.Message.create({
        thread_id,
        tenant_id,
        sender_id,
        receiver_id: recipient_id,
        message: text,
        message_type: 'text',
        reply_to_message_id,
      }, { transaction: t });

      await db.MessageThread.update(
        { last_message_at: new Date() },
        { where: { id: thread_id }, transaction: t },
      );

      await db.MessageThreadParticipant.increment('unread_count', {
        where: {
          thread_id,
          user_id: { [Op.ne]: sender_id },
          is_active: true,
        },
        transaction: t,
      });

      return newMessage;
    });

    const recipients = await db.MessageThreadParticipant.findAll({
      where: { thread_id, user_id: { [Op.ne]: sender_id }, is_active: true },
      attributes: ['user_id'],
    });
    const preview = text.length > 100 ? `${text.slice(0, 100)}…` : text;
    for (const r of recipients) {
      const uid = r.user_id;
      const allow = await NotificationService.shouldSendNotification(uid, 'message');
      if (allow) {
        await NotificationService.createMessageNotification(
          uid,
          'message',
          sender_id,
          thread_id,
          preview,
        );
      }
    }

    const messageWithDetails = await db.Message.findByPk(result.id, {
      include: [
        {
          model: db.User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'email'],
        },
        {
          model: db.Message,
          as: 'replyTo',
          include: [{
            model: db.User,
            as: 'sender',
            attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'email'],
          }],
        },
      ],
    });

    return res.status(201).json({
      status: true,
      message: 'Message sent successfully.',
      data: formatMessagePayload(messageWithDetails),
      thread_id: String(thread_id),
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error sending message.',
      error: err.message,
    });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  const thread_id = req.params.thread_id || req.body.thread_id;
  const { receiver_id: bodyReceiverId, message, reply_to_message_id } = req.body;
  const sender_id = req.user.id;

  try {
    if (!thread_id) {
      return res.status(400).json({ status: false, message: 'thread_id is required.' });
    }

    // Verify user is part of the thread
    const participant = await db.MessageThreadParticipant.findOne({
      where: { thread_id, user_id: sender_id, is_active: true }
    });

    if (!participant) {
      return res.status(403).json({
        status: false,
        message: 'Access denied. You are not part of this conversation.'
      });
    }

    const threadRow = await db.MessageThread.findByPk(thread_id, {
      attributes: ['id', 'thread_type', 'is_active', 'tenant_id'],
    });
    if (!threadRow || threadRow.is_active === false) {
      return res.status(404).json({ status: false, message: 'Thread not found.' });
    }
    const denial = denyIfCrossTenant(req, threadRow.tenant_id);
    if (denial) {
      return res.status(denial.status).json({ status: false, message: denial.message });
    }

    let text = message != null ? String(message).trim() : '';
    if (!text && req.file) {
      text = req.file.mimetype.startsWith('image/')
        ? 'Photo'
        : req.file.mimetype.startsWith('video/')
          ? 'Video'
          : req.file.mimetype.startsWith('audio/')
            ? 'Audio'
            : 'Attachment';
    }
    if (!text && !req.file) {
      return res.status(400).json({
        status: false,
        message: 'Message cannot be empty.',
      });
    }

    const allowedTypes = ['text', 'image', 'video', 'file', 'audio'];
    let message_type = req.body.message_type && allowedTypes.includes(String(req.body.message_type))
      ? String(req.body.message_type)
      : 'text';
    if (req.file) {
      message_type = req.file.mimetype.startsWith('image/')
        ? 'image'
        : req.file.mimetype.startsWith('video/')
          ? 'video'
          : req.file.mimetype.startsWith('audio/')
            ? 'audio'
            : 'file';
    }

    let receiver_id = bodyReceiverId || null;
    if (threadRow.thread_type === 'direct') {
      const other = await db.MessageThreadParticipant.findOne({
        where: { thread_id, user_id: { [Op.ne]: sender_id }, is_active: true },
        attributes: ['user_id'],
      });
      receiver_id = other ? other.user_id : null;
    } else {
      receiver_id = null;
    }

    let mediaUrl = null;
    let mediaMetadata = null;
    if (req.file) {
      const media = await descriptorFromMulterFile(req.file, 'message');
      mediaUrl = media.url;
      mediaMetadata = {
        ...media.metadata,
        storage_key: media.storage_key,
        mime_type: media.mime_type,
      };
      void recordMediaAsset(media, {
        ownerId: sender_id,
        tenantId: threadRow.tenant_id || tenantIdForCreate(req),
        category: 'message',
        entityType: 'message_thread',
        entityId: thread_id,
      });
    }

    const msgTenantId = threadRow.tenant_id || tenantIdForCreate(req);

    const result = await db.sequelize.transaction(async (t) => {
      // Create message
      const newMessage = await db.Message.create({
        thread_id,
        tenant_id: msgTenantId,
        sender_id,
        receiver_id,
        message: text,
        message_type,
        media_url: mediaUrl,
        media_metadata: mediaMetadata,
        reply_to_message_id
      }, { transaction: t });

      // Update thread's last message timestamp
      await db.MessageThread.update(
        { last_message_at: new Date() },
        { where: { id: thread_id }, transaction: t }
      );

      // Increment unread count for other participants
      await db.MessageThreadParticipant.increment('unread_count', {
        where: {
          thread_id,
          user_id: { [Op.ne]: sender_id },
          is_active: true
        },
        transaction: t
      });

      return newMessage;
    });

    const recipients = await db.MessageThreadParticipant.findAll({
      where: { thread_id, user_id: { [Op.ne]: sender_id }, is_active: true },
      attributes: ['user_id'],
    });
    const preview =
      text.length > 100 ? `${text.slice(0, 100)}…` : text;
    for (const r of recipients) {
      const uid = r.user_id;
      const allow = await NotificationService.shouldSendNotification(uid, 'message');
      if (allow) {
        await NotificationService.createMessageNotification(
          uid,
          'message',
          sender_id,
          thread_id,
          preview
        );
      }
    }

    // Fetch message with associations
    const messageWithDetails = await db.Message.findByPk(result.id, {
      include: [
        {
          model: db.User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'email']
        },
        {
          model: db.Message,
          as: 'replyTo',
          include: [{
            model: db.User,
            as: 'sender',
            attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'email']
          }]
        }
      ]
    });

    return res.status(201).json({
      status: true,
      message: 'Message sent successfully.',
      data: formatMessagePayload(messageWithDetails)
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error sending message.',
      error: err.message
    });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  const { thread_id } = req.params;
  const user_id = req.user.id;

  try {
    // Verify user is part of the thread
    const participant = await db.MessageThreadParticipant.findOne({
      where: { thread_id, user_id, is_active: true }
    });

    if (!participant) {
      return res.status(403).json({
        status: false,
        message: 'Access denied. You are not part of this conversation.'
      });
    }

    await db.sequelize.transaction(async (t) => {
      // Mark messages as read
      await db.Message.update(
        { 
          is_read: true,
          read_at: new Date()
        },
        {
          where: {
            thread_id,
            receiver_id: user_id,
            is_read: false
          },
          transaction: t
        }
      );

      // Reset unread count
      await db.MessageThreadParticipant.update(
        { unread_count: 0 },
        { where: { thread_id, user_id }, transaction: t }
      );
    });

    return res.status(200).json({
      status: true,
      message: 'Messages marked as read.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error marking messages as read.',
      error: err.message
    });
  }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
  const user_id = req.user.id;

  try {
    const unreadCounts = await db.MessageThreadParticipant.findAll({
      where: { user_id, is_active: true },
      attributes: ['thread_id', 'unread_count'],
      include: [{
        model: db.MessageThread,
        as: 'thread',
        attributes: ['id', 'name', 'thread_type']
      }]
    });

    const totalUnread = unreadCounts.reduce((sum, item) => sum + item.unread_count, 0);

    return res.status(200).json({
      status: true,
      data: {
        total_unread: totalUnread,
        thread_counts: unreadCounts,
        threads: unreadCounts.map((row) => {
          const x = plainRow(row);
          return { thread_id: x.thread_id, unread_count: x.unread_count };
        }),
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching unread count.',
      error: err.message
    });
  }
};

// Delete a message (soft delete)
exports.deleteMessage = async (req, res) => {
  const { message_id } = req.params;
  const user_id = req.user.id;

  try {
    const message = await db.Message.findOne({
      where: {
        id: message_id,
        sender_id: user_id,
        is_deleted: false
      }
    });

    if (!message) {
      return res.status(404).json({
        status: false,
        message: 'Message not found or you do not have permission to delete it.'
      });
    }

    await message.update({
      is_deleted: true,
      deleted_at: new Date()
    });

    return res.status(200).json({
      status: true,
      message: 'Message deleted successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error deleting message.',
      error: err.message
    });
  }
};

// Add participant to group chat
exports.addParticipant = async (req, res) => {
  const { thread_id } = req.params;
  const { user_id, role = 'member' } = req.body;
  const admin_id = req.user.id;

  try {
    // Verify admin is thread admin
    const adminParticipant = await db.MessageThreadParticipant.findOne({
      where: { thread_id, user_id: admin_id, role: 'admin', is_active: true }
    });

    if (!adminParticipant) {
      return res.status(403).json({
        status: false,
        message: 'Access denied. Only admins can add participants.'
      });
    }

    // Check if user is already a participant
    const existingParticipant = await db.MessageThreadParticipant.findOne({
      where: { thread_id, user_id, is_active: true }
    });

    if (existingParticipant) {
      return res.status(400).json({
        status: false,
        message: 'User is already a participant in this thread.'
      });
    }

    await db.MessageThreadParticipant.create({
      thread_id,
      user_id,
      role
    });

    return res.status(200).json({
      status: true,
      message: 'Participant added successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error adding participant.',
      error: err.message
    });
  }
};

// Remove participant from group chat
exports.removeParticipant = async (req, res) => {
  const { thread_id, user_id } = req.params;
  const admin_id = req.user.id;

  try {
    // Verify admin is thread admin
    const adminParticipant = await db.MessageThreadParticipant.findOne({
      where: { thread_id, user_id: admin_id, role: 'admin', is_active: true }
    });

    if (!adminParticipant) {
      return res.status(403).json({
        status: false,
        message: 'Access denied. Only admins can remove participants.'
      });
    }

    // Cannot remove yourself if you're the only admin
    if (String(user_id) === String(admin_id)) {
      const adminCount = await db.MessageThreadParticipant.count({
        where: { thread_id, role: 'admin', is_active: true }
      });

      if (adminCount === 1) {
        return res.status(400).json({
          status: false,
          message: 'Cannot remove the only admin from the group.'
        });
      }
    }

    await db.MessageThreadParticipant.update(
      { 
        is_active: false,
        left_at: new Date()
      },
      { where: { thread_id, user_id } }
    );

    return res.status(200).json({
      status: true,
      message: 'Participant removed successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error removing participant.',
      error: err.message
    });
  }
}; 