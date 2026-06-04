const db = require('../database/index');
const { Op } = require('sequelize');
const { mergeTenantWhere, denyIfCrossTenant, isPlatformUser } = require('../utils/tenantScope');
const NotificationService = require('../services/notificationService');

function respondIfCrossTenant(res, req, resource) {
  const denial = denyIfCrossTenant(req, resource?.tenant_id);
  if (!denial) return false;
  res.status(denial.status).json({ status: false, message: denial.message });
  return true;
}

function formatNotificationRow(n) {
  const plain = n.get ? n.get({ plain: true }) : n;
  const readAt =
    plain.is_read && plain.read_at
      ? plain.read_at
      : plain.is_read
        ? plain.updated_at
        : null;
  let priority = plain.priority || 'normal';
  if (priority === 'normal') priority = 'medium';
  return {
    ...plain,
    read_at: readAt || undefined,
    is_read: !!plain.is_read,
    priority,
  };
}

// Get all notifications for a user with pagination
exports.getUserNotifications = async (req, res) => {
  const user_id = req.user.id;
  const { page = 1, limit = 20, type, is_read } = req.query;

  try {
    const lim = Math.min(100, parseInt(String(limit), 10) || 20);
    const pg = parseInt(String(page), 10) || 1;
    const offset = (pg - 1) * lim;
    let where = { user_id };
    if (type) where.type = type;
    if (is_read !== undefined && is_read !== '') {
      const v = String(is_read).toLowerCase();
      where.is_read = v === 'true' || v === '1';
    }
    where = mergeTenantWhere(where, req.user);

    const { count, rows } = await db.Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset,
      limit: lim
    });

    const notifications = rows.map((n) => formatNotificationRow(n));
    const pages = Math.ceil(count / lim) || 1;

    return res.status(200).json({
      status: true,
      data: {
        notifications,
        pagination: {
          total: count,
          page: pg,
          pages,
          totalPages: pages,
        },
        total: count,
        page: pg,
        totalPages: pages,
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching notifications.',
      error: err.message
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  const { notification_id } = req.params;
  const user_id = req.user.id;

  try {
    const notification = await db.Notification.findOne({
      where: mergeTenantWhere({ id: notification_id, user_id }, req.user),
    });

    if (!notification) {
      return res.status(404).json({
        status: false,
        message: 'Notification not found.'
      });
    }
    if (respondIfCrossTenant(res, req, notification)) return;

    await notification.update({
      is_read: true,
      read_at: new Date()
    });

    await notification.reload();

    return res.status(200).json({
      status: true,
      message: 'Notification marked as read.',
      data: formatNotificationRow(notification)
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error marking notification as read.',
      error: err.message
    });
  }
};

// Mark multiple notifications as read
exports.markMultipleAsRead = async (req, res) => {
  const { notification_ids } = req.body;
  const user_id = req.user.id;

  try {
    if (!notification_ids || !Array.isArray(notification_ids)) {
      return res.status(400).json({
        status: false,
        message: 'Please provide an array of notification IDs.'
      });
    }

    await db.Notification.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: mergeTenantWhere(
          {
            id: { [Op.in]: notification_ids },
            user_id,
          },
          req.user,
        ),
      }
    );

    return res.status(200).json({
      status: true,
      message: 'Notifications marked as read successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error marking notifications as read.',
      error: err.message
    });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  const user_id = req.user.id;

  try {
    await db.Notification.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: mergeTenantWhere({ user_id, is_read: false }, req.user),
      }
    );

    return res.status(200).json({
      status: true,
      message: 'All notifications marked as read.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error marking all notifications as read.',
      error: err.message
    });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  const { notification_id } = req.params;
  const user_id = req.user.id;

  try {
    const notification = await db.Notification.findOne({
      where: mergeTenantWhere({ id: notification_id, user_id }, req.user),
    });

    if (!notification) {
      return res.status(404).json({
        status: false,
        message: 'Notification not found.'
      });
    }
    if (respondIfCrossTenant(res, req, notification)) return;

    await notification.destroy();

    return res.status(200).json({
      status: true,
      message: 'Notification deleted successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error deleting notification.',
      error: err.message
    });
  }
};

// Delete multiple notifications
exports.deleteMultipleNotifications = async (req, res) => {
  const { notification_ids } = req.body;
  const user_id = req.user.id;

  try {
    if (!notification_ids || !Array.isArray(notification_ids)) {
      return res.status(400).json({
        status: false,
        message: 'Please provide an array of notification IDs.'
      });
    }

    await db.Notification.destroy({
      where: mergeTenantWhere(
        {
          id: { [Op.in]: notification_ids },
          user_id,
        },
        req.user,
      ),
    });

    return res.status(200).json({
      status: true,
      message: 'Notifications deleted successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error deleting notifications.',
      error: err.message
    });
  }
};

// Get notification statistics
exports.getNotificationStats = async (req, res) => {
  const user_id = req.user.id;

  try {
    const stats = await db.Notification.findAll({
      where: mergeTenantWhere({ user_id }, req.user),
      attributes: [
        'type',
        'is_read',
        [db.sequelize.fn('COUNT', db.sequelize.col('Notification.id')), 'count']
      ],
      group: ['Notification.type', 'Notification.is_read']
    });

    const notificationStats = {
      total: 0,
      unread: 0,
      by_type: {},
      by_read_status: {
        read: 0,
        unread: 0
      }
    };

    stats.forEach(stat => {
      const count = parseInt(stat.dataValues.count);
      const type = stat.type;
      const isRead = stat.is_read;

      notificationStats.total += count;
      
      if (isRead) {
        notificationStats.by_read_status.read += count;
      } else {
        notificationStats.by_read_status.unread += count;
        notificationStats.unread += count;
      }

      if (!notificationStats.by_type[type]) {
        notificationStats.by_type[type] = { read: 0, unread: 0 };
      }

      if (isRead) {
        notificationStats.by_type[type].read += count;
      } else {
        notificationStats.by_type[type].unread += count;
      }
    });

    return res.status(200).json({
      status: true,
      data: notificationStats
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching notification statistics.',
      error: err.message
    });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  const user_id = req.user.id;

  try {
    const count = await db.Notification.count({
      where: mergeTenantWhere({ user_id, is_read: false }, req.user),
    });

    return res.status(200).json({
      status: true,
      data: { unread_count: count }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching unread count.',
      error: err.message
    });
  }
};

// Create a notification — self only (platform admins may target any user)
exports.createNotification = async (req, res) => {
  const { user_id: targetUserId, type, title, body, link_url, metadata } = req.body;
  const callerId = req.user.id;

  try {
    const validTypes = [
      'follow', 'comment', 'answer', 'like', 'mention', 'message',
      'group_invite', 'connection_request', 'job_application',
      'endorsement', 'skill_endorsement', 'post_share', 'event_reminder',
      'course_enrollment', 'certification_earned', 'achievement_unlocked',
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid notification type.',
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        status: false,
        message: 'Title and body are required.',
      });
    }

    const recipientId = targetUserId || callerId;
    if (!isPlatformUser(req.user) && String(recipientId) !== String(callerId)) {
      return res.status(403).json({
        status: false,
        message: 'You can only create notifications for your own account.',
      });
    }

    const notification = await NotificationService.persistNotification({
      user_id: recipientId,
      type,
      title,
      body,
      link_url,
      metadata: metadata || {},
    });

    return res.status(201).json({
      status: true,
      message: 'Notification created successfully.',
      data: notification,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error creating notification.',
      error: err.message,
    });
  }
};

// Get notification settings for a user
exports.getNotificationSettings = async (req, res) => {
  const user_id = req.user.id;

  try {
    let settings = await db.NotificationSetting.findOne({
      where: { user_id }
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await db.NotificationSetting.create({
        user_id,
        email_notifications: true,
        push_notifications: true,
        in_app_notifications: true,
        notification_types: {
          social: true,
          professional: true,
          messages: true,
          system: true
        }
      });
    }

    return res.status(200).json({
      status: true,
      data: settings
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching notification settings.',
      error: err.message
    });
  }
};

// Update notification settings
exports.updateNotificationSettings = async (req, res) => {
  const user_id = req.user.id;
  const {
    email_notifications,
    push_notifications,
    in_app_notifications,
    notification_types
  } = req.body;

  try {
    let settings = await db.NotificationSetting.findOne({
      where: { user_id }
    });

    if (!settings) {
      settings = await db.NotificationSetting.create({
        user_id,
        email_notifications: email_notifications !== undefined ? email_notifications : true,
        push_notifications: push_notifications !== undefined ? push_notifications : true,
        in_app_notifications: in_app_notifications !== undefined ? in_app_notifications : true,
        notification_types: notification_types || {
          social: true,
          professional: true,
          messages: true,
          system: true
        }
      });
    } else {
      await settings.update({
        email_notifications: email_notifications !== undefined ? email_notifications : settings.email_notifications,
        push_notifications: push_notifications !== undefined ? push_notifications : settings.push_notifications,
        in_app_notifications: in_app_notifications !== undefined ? in_app_notifications : settings.in_app_notifications,
        notification_types: notification_types || settings.notification_types
      });
    }

    return res.status(200).json({
      status: true,
      message: 'Notification settings updated successfully.',
      data: settings
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error updating notification settings.',
      error: err.message
    });
  }
};

// Bulk notification operations
exports.bulkNotificationOperations = async (req, res) => {
  const { action, notification_ids } = req.body;
  const user_id = req.user.id;

  try {
    if (!action || !notification_ids || !Array.isArray(notification_ids)) {
      return res.status(400).json({
        status: false,
        message: 'Please provide action and array of notification IDs.'
      });
    }

    const validActions = ['mark_read', 'delete'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid action. Use "mark_read" or "delete".'
      });
    }

    if (action === 'mark_read') {
      await db.Notification.update(
        {
          is_read: true,
          read_at: new Date()
        },
        {
          where: mergeTenantWhere(
            {
              id: { [Op.in]: notification_ids },
              user_id,
            },
            req.user,
          ),
        }
      );

      return res.status(200).json({
        status: true,
        message: 'Notifications marked as read successfully.'
      });
    } else if (action === 'delete') {
      await db.Notification.destroy({
        where: mergeTenantWhere(
          {
            id: { [Op.in]: notification_ids },
            user_id,
          },
          req.user,
        ),
      });

      return res.status(200).json({
        status: true,
        message: 'Notifications deleted successfully.'
      });
    }
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error performing bulk operation.',
      error: err.message
    });
  }
};
