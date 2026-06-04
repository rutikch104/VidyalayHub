const db = require('../database/index');
const { mergeTenantWhere, denyIfCrossTenant } = require('../utils/tenantScope');
const { assertBookmarkableItem, tenantIdForCreate } = require('../utils/tenantHelpers');

const VALID_BOOKMARK_TYPES = [
  'question',
  'answer',
  'post',
  'course',
  'resource',
  'event',
  'job',
  'community_post',
];

async function fetchBookmarkItemDetails(req, type, typeId) {
  switch (type) {
    case 'post':
      return db.Post.findOne({
        where: mergeTenantWhere({ id: typeId }, req.user),
        include: [{
          model: db.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
        }],
      });
    case 'community_post':
      return db.CommunityPost.findOne({
        where: { id: typeId, is_deleted: false },
        include: [
          {
            model: db.User,
            as: 'author',
            attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
          },
          { model: db.Community, as: 'community', attributes: ['id', 'name'] },
        ],
      });
    case 'question':
      return db.GlobalQuestion.findByPk(typeId, {
        include: [{
          model: db.User,
          as: 'asker',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
        }],
      });
    case 'answer':
      return db.GlobalAnswer.findByPk(typeId, {
        include: [{
          model: db.User,
          as: 'answerer',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
        }],
      });
    case 'resource':
      return db.ResourceLibrary.findOne({
        where: mergeTenantWhere({ id: typeId }, req.user),
        include: [{
          model: db.User,
          as: 'uploader',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
        }],
      });
    case 'event':
      return db.Event.findByPk(typeId, {
        include: [{
          model: db.User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
        }],
      });
    case 'job':
      return db.JobPost.findByPk(typeId, {
        include: [{
          model: db.User,
          as: 'poster',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
        }],
      });
    default:
      return null;
  }
}

function respondIfCrossTenant(res, req, resource) {
  const denial = denyIfCrossTenant(req, resource?.tenant_id);
  if (!denial) return false;
  res.status(denial.status).json({ status: false, message: denial.message });
  return true;
}

// Create a new bookmark
exports.createBookmark = async (req, res) => {
  const { type, type_id: rawTypeId } = req.body;
  const user_id = req.user.id;
  const type_id = rawTypeId != null ? String(rawTypeId) : '';

  try {
    // Validate bookmark type
    if (!VALID_BOOKMARK_TYPES.includes(type)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid bookmark type.',
      });
    }

    if (!type_id) {
      return res.status(400).json({ status: false, message: 'type_id is required.' });
    }

    // Check if bookmark already exists (idempotent create)
    const existingBookmark = await db.Bookmark.findOne({
      where: mergeTenantWhere({ user_id, type, type_id }, req.user),
    });

    if (existingBookmark) {
      return res.status(200).json({
        status: true,
        message: 'Already bookmarked.',
        data: existingBookmark
      });
    }

    const access = await assertBookmarkableItem(req, type, type_id);
    if (!access.ok) {
      return res.status(access.status).json({ status: false, message: access.message });
    }

    let itemExists = true;
    if (['question', 'answer'].includes(type)) {
      const Model = type === 'question' ? db.GlobalQuestion : db.GlobalAnswer;
      itemExists = !!(await Model.findByPk(type_id));
    } else if (type === 'course') {
      itemExists = true;
    } else if (type === 'post') {
      itemExists = !!(await db.Post.findOne({
        where: mergeTenantWhere({ id: type_id }, req.user),
      }));
    } else if (type === 'resource') {
      itemExists = !!(await db.ResourceLibrary.findOne({
        where: mergeTenantWhere({ id: type_id }, req.user),
      }));
    } else if (type === 'event') {
      itemExists = !!(await db.Event.findByPk(type_id));
    } else if (type === 'job') {
      itemExists = !!(await db.JobPost.findByPk(type_id, {
        attributes: ['id', 'is_active'],
      }));
    } else if (type === 'community_post') {
      itemExists = !!(await db.CommunityPost.findOne({
        where: { id: type_id, is_deleted: false },
        attributes: ['id'],
      }));
    }

    if (!itemExists) {
      return res.status(404).json({
        status: false,
        message: `${type} not found.`,
      });
    }

    let bookmark;
    try {
      bookmark = await db.Bookmark.create({
        user_id,
        type,
        type_id,
        tenant_id: tenantIdForCreate(req),
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        const again = await db.Bookmark.findOne({ where: { user_id, type, type_id } });
        if (again) {
          return res.status(200).json({
            status: true,
            message: 'Already bookmarked.',
            data: again
          });
        }
      }
      throw err;
    }

    return res.status(201).json({
      status: true,
      message: 'Bookmark created successfully.',
      data: bookmark
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error creating bookmark.',
      error: err.message
    });
  }
};

// Get all bookmarks for a user
exports.getUserBookmarks = async (req, res) => {
  const user_id = req.user.id;
  const { page = 1, limit = 10, type } = req.query;
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const pageNum = Math.max(1, parseInt(page, 10) || 1);

  try {
    const offset = (pageNum - 1) * limitNum;
    let where = { user_id };

    if (type) {
      where.type = type;
    }
    where = mergeTenantWhere(where, req.user);

    const { count, rows } = await db.Bookmark.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: limitNum
    });

    // Fetch the actual bookmarked items with details
    const bookmarksWithDetails = await Promise.all(
      rows.map(async (bookmark) => {
        let itemDetails = null;
        try {
          itemDetails = await fetchBookmarkItemDetails(req, bookmark.type, bookmark.type_id);
        } catch (err) {
          console.error(`Error fetching ${bookmark.type} details:`, err);
        }
        const plain = bookmark.toJSON();
        return {
          ...plain,
          item: itemDetails ? itemDetails.get({ plain: true }) : null,
        };
      }),
    );

    return res.status(200).json({
      status: true,
      data: {
        bookmarks: bookmarksWithDetails,
        pagination: {
          total: count,
          page: pageNum,
          pages: limitNum ? Math.ceil(count / limitNum) : 0
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching bookmarks.',
      error: err.message
    });
  }
};

// Get bookmarks by type for a user
exports.getUserBookmarksByType = async (req, res) => {
  const user_id = req.user.id;
  const { type } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 10));
  const pageNum = Math.max(1, parseInt(page, 10) || 1);

  try {
    // Validate bookmark type
    if (!VALID_BOOKMARK_TYPES.includes(type)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid bookmark type.',
      });
    }

    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await db.Bookmark.findAndCountAll({
      where: mergeTenantWhere({ user_id, type }, req.user),
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: limitNum
    });

    // Fetch the actual bookmarked items with details
    const bookmarksWithDetails = await Promise.all(
      rows.map(async (bookmark) => {
        let itemDetails = null;
        try {
          itemDetails = await fetchBookmarkItemDetails(req, bookmark.type, bookmark.type_id);
        } catch (err) {
          console.error(`Error fetching ${bookmark.type} details:`, err);
        }
        const plain = bookmark.toJSON();
        return {
          ...plain,
          item: itemDetails ? itemDetails.get({ plain: true }) : null,
        };
      }),
    );

    return res.status(200).json({
      status: true,
      data: {
        bookmarks: bookmarksWithDetails,
        pagination: {
          total: count,
          page: pageNum,
          pages: limitNum ? Math.ceil(count / limitNum) : 0
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching bookmarks.',
      error: err.message
    });
  }
};

// Delete a bookmark
exports.deleteBookmark = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const bookmark = await db.Bookmark.findOne({
      where: mergeTenantWhere({ id, user_id }, req.user),
    });

    if (!bookmark) {
      return res.status(404).json({
        status: false,
        message: 'Bookmark not found.'
      });
    }
    if (respondIfCrossTenant(res, req, bookmark)) return;

    await bookmark.destroy();

    return res.status(200).json({
      status: true,
      message: 'Bookmark deleted successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error deleting bookmark.',
      error: err.message
    });
  }
};

// Check if item is bookmarked
exports.isBookmarked = async (req, res) => {
  const { type, type_id: rawTypeId } = req.query;
  const user_id = req.user.id;
  const type_id = rawTypeId != null ? String(rawTypeId) : '';

  try {
    // Validate bookmark type
    if (!VALID_BOOKMARK_TYPES.includes(type)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid bookmark type.',
      });
    }

    if (!type_id) {
      return res.status(400).json({ status: false, message: 'type_id is required.' });
    }

    const bookmark = await db.Bookmark.findOne({
      where: mergeTenantWhere({ user_id, type, type_id }, req.user),
    });

    return res.status(200).json({
      status: true,
      data: {
        is_bookmarked: !!bookmark,
        bookmark_id: bookmark ? bookmark.id : undefined,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error checking bookmark status.',
      error: err.message
    });
  }
};

// Get bookmark statistics for a user
exports.getBookmarkStats = async (req, res) => {
  const user_id = req.user.id;

  try {
    const [stats, total] = await Promise.all([
      db.Bookmark.findAll({
        where: mergeTenantWhere({ user_id }, req.user),
        attributes: [
          'type',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: ['type']
      }),
      db.Bookmark.count({ where: mergeTenantWhere({ user_id }, req.user) }),
    ]);

    const by_type = {
      post: 0,
      question: 0,
      answer: 0,
      resource: 0,
      course: 0,
      event: 0,
      job: 0,
      community_post: 0,
    };
    stats.forEach((stat) => {
      const t = stat.type;
      if (t && Object.prototype.hasOwnProperty.call(by_type, t)) {
        by_type[t] = parseInt(stat.dataValues.count, 10) || 0;
      }
    });

    return res.status(200).json({
      status: true,
      data: { total, by_type }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching bookmark statistics.',
      error: err.message
    });
  }
}; 