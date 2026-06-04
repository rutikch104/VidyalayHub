const db = require('../database/index');
const NotificationService = require('../services/notificationService');

function actorLabel(reqUser) {
  return [reqUser.first_name, reqUser.last_name].filter(Boolean).join(' ').trim()
    || reqUser.name
    || 'Someone';
}

function parseMentionedUsers(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

async function notifyMentionedUsers({
  mentionedUserIds,
  reqUser,
  title,
  body,
  link_url,
  metadata = {},
  transaction,
}) {
  const ids = [...new Set((mentionedUserIds || []).map(String))];
  const rows = [];
  for (const user_id of ids) {
    if (String(user_id) === String(reqUser.id)) continue;
    const ok = await NotificationService.shouldSendNotification(user_id, 'mention');
    if (!ok) continue;
    rows.push({
      user_id,
      type: 'mention',
      title,
      body,
      link_url,
      metadata: { actor_id: reqUser.id, ...metadata },
    });
  }
  if (rows.length) {
    await db.Notification.bulkCreate(rows, transaction ? { transaction } : undefined);
  }
}

module.exports = {
  actorLabel,
  parseMentionedUsers,
  notifyMentionedUsers,
};
