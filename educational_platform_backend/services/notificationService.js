const db = require('../database/index');
const { resolveUserTenantId } = require('../utils/tenantHelpers');

class NotificationService {
  static async persistNotification(fields) {
    const tenant_id =
      fields.tenant_id ||
      (fields.user_id ? await resolveUserTenantId(fields.user_id) : null);
    return db.Notification.create({ ...fields, tenant_id: tenant_id || null });
  }
  // Create a notification for social interactions
  static async createSocialNotification(userId, type, actorId, targetId, content = null) {
    try {
      const actor = await db.User.findByPk(actorId, {
        attributes: ['id', 'first_name', 'last_name', 'profile_picture']
      });

      if (!actor) return null;

      let title, body, linkUrl;

      const actorName = [actor.first_name, actor.last_name].filter(Boolean).join(' ').trim() || 'Someone';
      switch (type) {
        case 'like':
          title = 'New like on your content';
          body = `${actorName} liked your content`;
          linkUrl = `/posts/${targetId}`;
          break;
        case 'comment':
          title = 'New comment on your content';
          body = `${actorName} commented on your content`;
          linkUrl = `/posts/${targetId}`;
          break;
        case 'mention':
          title = 'You were mentioned';
          body = `${actorName} mentioned you in a post`;
          linkUrl = `/posts/${targetId}`;
          break;
        case 'follow':
          title = 'New follower';
          body = `${actorName} started following you`;
          linkUrl = `/profile/${actorId}`;
          break;
        case 'post_share':
          title = 'Your post was shared';
          body = `${actorName} shared your post`;
          linkUrl = `/posts/${targetId}`;
          break;
        default:
          return null;
      }

      return await NotificationService.persistNotification({
        user_id: userId,
        type,
        title,
        body,
        link_url: linkUrl,
        metadata: {
          actor_id: actorId,
          target_id: targetId,
          content_preview: content ? content.substring(0, 100) : null
        }
      });
    } catch (error) {
      console.error('Error creating social notification:', error);
      return null;
    }
  }

  // Create a notification for professional activities
  static async createProfessionalNotification(userId, type, actorId, targetId, additionalData = {}) {
    try {
      const actor = await db.User.findByPk(actorId, {
        attributes: ['id', 'first_name', 'last_name', 'profile_picture']
      });

      if (!actor) return null;

      let title, body, linkUrl;

      const actorName = [actor.first_name, actor.last_name].filter(Boolean).join(' ').trim() || 'Someone';
      switch (type) {
        case 'connection_request':
          title = 'New connection request';
          body = `${actorName} sent you a connection request`;
          linkUrl = `/connections/pending`;
          break;
        case 'job_application':
          title = 'New job application';
          body = `${actorName} applied for your job posting`;
          linkUrl = `/jobs/applications/${targetId}`;
          break;
        case 'endorsement':
          title = 'New skill endorsement';
          body = `${actorName} endorsed your ${additionalData.skill || 'skill'}`;
          linkUrl = `/profile/skills`;
          break;
        case 'answer':
          title = 'New answer to your question';
          body = `${actorName} answered your question`;
          linkUrl = `/questions/${targetId}`;
          break;
        default:
          return null;
      }

      return await NotificationService.persistNotification({
        user_id: userId,
        type,
        title,
        body,
        link_url: linkUrl,
        metadata: {
          actor_id: actorId,
          target_id: targetId,
          ...additionalData
        }
      });
    } catch (error) {
      console.error('Error creating professional notification:', error);
      return null;
    }
  }

  // Create a notification for messages
  static async createMessageNotification(userId, type, actorId, threadId, messagePreview = null) {
    try {
      const actor = await db.User.findByPk(actorId, {
        attributes: ['id', 'first_name', 'last_name', 'profile_picture']
      });

      if (!actor) return null;

      let title, body, linkUrl;

      const actorName = [actor.first_name, actor.last_name].filter(Boolean).join(' ').trim() || 'Someone';
      switch (type) {
        case 'message':
          title = 'New message';
          body = messagePreview
            ? `${actorName}: ${messagePreview}`
            : `${actorName} sent you a message`;
          linkUrl = `/messages/threads/${threadId}`;
          break;
        case 'group_invite':
          title = 'Group chat invitation';
          body = `${actorName} invited you to a group chat`;
          linkUrl = `/messages/threads/${threadId}`;
          break;
        default:
          return null;
      }

      return await NotificationService.persistNotification({
        user_id: userId,
        type,
        title,
        body,
        link_url: linkUrl,
        metadata: {
          actor_id: actorId,
          thread_id: threadId,
          message_preview: messagePreview
        }
      });
    } catch (error) {
      console.error('Error creating message notification:', error);
      return null;
    }
  }

  // Create a notification for learning achievements
  static async createLearningNotification(userId, type, achievementData = {}) {
    try {
      let title, body, linkUrl;

      switch (type) {
        case 'course_enrollment':
          title = 'Course enrollment successful';
          body = `You have been successfully enrolled in ${achievementData.courseName || 'the course'}`;
          linkUrl = `/courses/${achievementData.courseId}`;
          break;
        case 'certification_earned':
          title = 'Certification earned!';
          body = `Congratulations! You have earned the ${achievementData.certificationName || 'certification'}`;
          linkUrl = `/certifications/${achievementData.certificationId}`;
          break;
        case 'achievement_unlocked':
          title = 'Achievement unlocked!';
          body = `You have unlocked the ${achievementData.achievementName || 'achievement'}`;
          linkUrl = `/achievements`;
          break;
        case 'event_reminder':
          title = 'Event reminder';
          body = `Reminder: ${achievementData.eventName || 'Your event'} starts in ${achievementData.timeUntil || '1 hour'}`;
          linkUrl = `/events/${achievementData.eventId}`;
          break;
        default:
          return null;
      }

      return await NotificationService.persistNotification({
        user_id: userId,
        type,
        title,
        body,
        link_url: linkUrl,
        metadata: achievementData
      });
    } catch (error) {
      console.error('Error creating learning notification:', error);
      return null;
    }
  }

  // Create a system notification
  static async createSystemNotification(userId, type, title, body, linkUrl = null, metadata = {}) {
    try {
      return await NotificationService.persistNotification({
        user_id: userId,
        type,
        title,
        body,
        link_url: linkUrl,
        metadata,
        priority: metadata.priority || 'normal'
      });
    } catch (error) {
      console.error('Error creating system notification:', error);
      return null;
    }
  }

  // Bulk create notifications for multiple users
  static async createBulkNotifications(userIds, type, title, body, linkUrl = null, metadata = {}) {
    try {
      const rows = [];
      for (const userId of userIds) {
        const tenant_id = await resolveUserTenantId(userId);
        rows.push({
          user_id: userId,
          tenant_id,
          type,
          title,
          body,
          link_url: linkUrl,
          metadata
        });
      }

      return await db.Notification.bulkCreate(rows);
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      return [];
    }
  }

  // Check if user has notification settings enabled for specific type
  static async shouldSendNotification(userId, notificationType) {
    try {
      const settings = await db.NotificationSetting.findOne({
        where: { user_id: userId }
      });

      if (!settings) return true; // Default to true if no settings

      // Check if notifications are globally disabled
      if (!settings.in_app_notifications) return false;

      // Check if do not disturb is enabled
      if (settings.do_not_disturb) return false;

      // Check quiet hours
      if (settings.quiet_hours.enabled) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const startTime = settings.quiet_hours.start_time;
        const endTime = settings.quiet_hours.end_time;

        if (startTime <= endTime) {
          if (currentTime >= startTime && currentTime <= endTime) return false;
        } else {
          if (currentTime >= startTime || currentTime <= endTime) return false;
        }
      }

      // Check specific notification type settings (flat booleans or per-type objects)
      const category = this.getNotificationCategory(notificationType);
      const types = settings.notification_types || {};
      if (category && Object.prototype.hasOwnProperty.call(types, category)) {
        const catVal = types[category];
        if (catVal === false) return false;
        if (catVal === true || catVal == null) return true;
        if (typeof catVal === 'object') {
          return catVal[notificationType] !== false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking notification settings:', error);
      return true; // Default to true on error
    }
  }

  // Get notification category based on type
  static getNotificationCategory(type) {
    const socialTypes = ['follow', 'comment', 'like', 'mention', 'post_share'];
    const professionalTypes = ['connection_request', 'job_application', 'endorsement', 'skill_endorsement', 'answer'];
    const messageTypes = ['message', 'group_invite'];
    const learningTypes = ['course_enrollment', 'certification_earned', 'achievement_unlocked', 'event_reminder'];

    if (socialTypes.includes(type)) return 'social';
    if (professionalTypes.includes(type)) return 'professional';
    if (messageTypes.includes(type)) return 'messages';
    if (learningTypes.includes(type)) return 'learning';
    
    return 'system';
  }
}

module.exports = NotificationService;
