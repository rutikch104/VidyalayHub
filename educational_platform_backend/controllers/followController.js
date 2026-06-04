const { Op } = require('sequelize');
const db = require('../database/index');
const NotificationService = require('../services/notificationService');
const {
  getBlockedUserIds,
  isBlockedBetween,
  enrichUsersForNetwork,
  NETWORK_USER_ATTRS,
} = require('../utils/networkHelpers');

exports.followUser = async (req, res) => {
  const follower_id = req.user.id;
  const following_id = req.params.user_id || req.body.user_id;

  try {
    if (!following_id) {
      return res.status(400).json({ status: false, message: 'user_id is required.' });
    }
    if (String(follower_id) === String(following_id)) {
      return res.status(400).json({ status: false, message: 'You cannot follow yourself.' });
    }

    const target = await db.User.findByPk(following_id, { attributes: ['id', 'is_approved'] });
    if (!target || !target.is_approved) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }

    if (await isBlockedBetween(follower_id, following_id)) {
      return res.status(403).json({ status: false, message: 'Unable to follow this user.' });
    }

    const existing = await db.UserFollow.findOne({
      where: { follower_id, following_id },
    });
    if (existing) {
      return res.status(200).json({
        status: true,
        message: 'Already following.',
        data: { following: true },
      });
    }

    await db.UserFollow.create({ follower_id, following_id });

    const allow = await NotificationService.shouldSendNotification(following_id, 'follow');
    if (allow) {
      await NotificationService.createSocialNotification(
        following_id,
        'follow',
        follower_id,
        null,
        {},
      );
    }

    return res.status(201).json({
      status: true,
      message: 'Now following user.',
      data: { following: true },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error following user.',
      error: err.message,
    });
  }
};

exports.unfollowUser = async (req, res) => {
  const follower_id = req.user.id;
  const following_id = req.params.user_id;

  try {
    const row = await db.UserFollow.findOne({
      where: { follower_id, following_id },
    });
    if (!row) {
      return res.status(404).json({ status: false, message: 'You are not following this user.' });
    }
    await row.destroy();
    return res.status(200).json({
      status: true,
      message: 'Unfollowed successfully.',
      data: { following: false },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error unfollowing user.',
      error: err.message,
    });
  }
};

exports.getFollowStatus = async (req, res) => {
  const follower_id = req.user.id;
  const following_id = req.params.user_id;

  try {
    const row = await db.UserFollow.findOne({
      where: { follower_id, following_id },
      attributes: ['id'],
    });
    return res.status(200).json({
      status: true,
      data: { following: Boolean(row) },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error resolving follow status.',
      error: err.message,
    });
  }
};

exports.getFollowing = async (req, res) => {
  const user_id = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  try {
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await db.UserFollow.findAndCountAll({
      where: { follower_id: user_id },
      include: [
        {
          model: db.User,
          as: 'following',
          attributes: NETWORK_USER_ATTRS,
        },
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: limitNum,
    });

    const users = rows.map((r) => r.following).filter(Boolean);
    const enriched = await enrichUsersForNetwork(user_id, users);

    return res.status(200).json({
      status: true,
      data: {
        users: enriched,
        pagination: {
          total: count,
          page: pageNum,
          pages: Math.ceil(count / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching following list.',
      error: err.message,
    });
  }
};

exports.getFollowers = async (req, res) => {
  const user_id = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  try {
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await db.UserFollow.findAndCountAll({
      where: { following_id: user_id },
      include: [
        {
          model: db.User,
          as: 'follower',
          attributes: NETWORK_USER_ATTRS,
        },
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: limitNum,
    });

    const users = rows.map((r) => r.follower).filter(Boolean);
    const enriched = await enrichUsersForNetwork(user_id, users);

    return res.status(200).json({
      status: true,
      data: {
        users: enriched,
        pagination: {
          total: count,
          page: pageNum,
          pages: Math.ceil(count / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching followers list.',
      error: err.message,
    });
  }
};

exports.getFollowStats = async (req, res) => {
  const user_id = req.user.id;
  try {
    const [following_count, followers_count] = await Promise.all([
      db.UserFollow.count({ where: { follower_id: user_id } }),
      db.UserFollow.count({ where: { following_id: user_id } }),
    ]);
    return res.status(200).json({
      status: true,
      data: { following_count, followers_count },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching follow stats.',
      error: err.message,
    });
  }
};
