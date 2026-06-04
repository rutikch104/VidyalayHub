const db = require('../database/index');
const { Op, col, where: sqlWhere } = require('sequelize');
const {
  buildCollegeHomeFeedWhere,
  isPlatformUser,
  mergeTenantWhere,
} = require('../utils/tenantScope');

/** Notices visible to students/teachers/alumni of a college right now */
function activeCollegeNoticeWhere(tenantId) {
  const now = new Date();
  return {
    tenant_id: tenantId,
    is_archived: false,
    starts_at: { [Op.lte]: now },
    [Op.or]: [{ ends_at: null }, { ends_at: { [Op.gte]: now } }],
  };
}

function authorDisplayName(author) {
  if (!author) return 'Administration';
  const j = typeof author.get === 'function' ? author.get({ plain: true }) : author;
  const n = [j.first_name, j.last_name].filter(Boolean).join(' ').trim();
  return n || 'Staff';
}

function mapTenantNoticeForPublic(row, { bodyMax = 400 } = {}) {
  const p = row.get ? row.get({ plain: true }) : row;
  const bodyFull = (p.body || '').trim();
  const bodyShort = bodyFull.length > bodyMax ? `${bodyFull.slice(0, bodyMax)}…` : bodyFull;
  const tenant = p.tenant || {};
  return {
    id: p.id,
    source: 'college',
    title: p.title || 'Notice',
    body: bodyShort,
    body_full: bodyFull,
    college_name: tenant.name || 'Your college',
    author_name: authorDisplayName(p.author),
    starts_at: p.starts_at,
    ends_at: p.ends_at,
    is_pinned: Boolean(p.is_pinned),
    created_at: p.created_at,
    community_id: null,
    community_name: null,
  };
}

// Get personalized home page feed
exports.getHomeFeed = async (req, res) => {
  const user_id = req.user.id;
  const {
    page = 1,
    limit = 20,
    content_type, // 'all', 'posts', 'questions', 'jobs', 'events'
    sort = 'recent', // recent, popular, trending, network
    filter_tenant = 'true' // Show college-specific content first
  } = req.query;

  try {
    const lim = parseInt(String(limit), 10) || 20;
    const pg = parseInt(String(page), 10) || 1;
    const offset = (pg - 1) * lim;

    // Step 1: Get user's network (1st degree connections)
    const userConnections = await db.Connection.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [
          { sender_id: user_id },
          { receiver_id: user_id }
        ]
      }
    });

    const connectedUserIds = userConnections.map(conn => 
      conn.sender_id === user_id ? conn.receiver_id : conn.sender_id
    );

    // Step 2: Get user's tenant for college-specific content
    const user = await db.User.findByPk(user_id, {
      attributes: ['tenant_id', 'user_type']
    });

    // Step 3: Build feed query based on content type
    let feedItems = [];

    if (content_type === 'all' || content_type === 'posts') {
      const posts = await getPostsFeed(req.user, filter_tenant === 'true');
      feedItems.push(...posts.map(post => ({
        type: 'post',
        content: post,
        score: calculatePostScore(post, user_id, connectedUserIds),
        created_at: post.created_at
      })));
    }

    if (content_type === 'all' || content_type === 'questions') {
      const questions = await getQuestionsFeed(user_id, connectedUserIds, user.tenant_id, filter_tenant === 'true');
      feedItems.push(...questions.map(question => ({
        type: 'question',
        content: question,
        score: calculateQuestionScore(question, user_id, connectedUserIds),
        created_at: question.created_at
      })));
    }

    if (content_type === 'all' || content_type === 'jobs') {
      const jobs = await getJobsFeed(user_id, connectedUserIds, user.tenant_id, filter_tenant === 'true');
      feedItems.push(...jobs.map(job => ({
        type: 'job',
        content: job,
        score: calculateJobScore(job, user_id, connectedUserIds),
        created_at: job.created_at
      })));
    }

    if (content_type === 'all' || content_type === 'events') {
      const events = await getEventsFeed(user_id, connectedUserIds, user.tenant_id, filter_tenant === 'true');
      feedItems.push(...events.map(event => ({
        type: 'event',
        content: event,
        score: calculateEventScore(event, user_id, connectedUserIds),
        created_at: event.created_at
      })));
    }

    // Step 4: Sort feed items based on user preference
    if (sort === 'recent') {
      feedItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === 'popular') {
      feedItems.sort((a, b) => b.score - a.score);
    } else if (sort === 'trending') {
      feedItems.sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a));
    } else if (sort === 'network') {
      feedItems.sort((a, b) => {
        // Prioritize content from 1st degree connections
        const aIsConnection = connectedUserIds.includes(a.content.user_id || a.content.posted_by);
        const bIsConnection = connectedUserIds.includes(b.content.user_id || b.content.posted_by);
        
        if (aIsConnection && !bIsConnection) return -1;
        if (!aIsConnection && bIsConnection) return 1;
        return b.score - a.score;
      });
    }

    // Step 5: Apply pagination
    const total = feedItems.length;
    const paginatedItems = feedItems.slice(offset, offset + lim);

    // Step 6: Enrich feed items with additional data
    const enrichedFeed = await enrichFeedItems(paginatedItems, user_id);

    return res.status(200).json({
      status: true,
      data: {
        feed: enrichedFeed,
        pagination: {
          total,
          page: pg,
          pages: Math.ceil(total / lim) || 1
        },
        user_context: {
          total_connections: connectedUserIds.length,
          tenant_id: user.tenant_id,
          user_type: user.user_type
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching home feed.',
      error: err.message
    });
  }
};

// Get posts for feed (college-scoped; platform users see all when filterTenant is false)
async function getPostsFeed(user, filterTenant) {
  let where = {};
  if (filterTenant) {
    const homeScope = buildCollegeHomeFeedWhere(user, { col, sqlWhere });
    if (homeScope) where = homeScope;
  } else if (!isPlatformUser(user)) {
    const homeScope = buildCollegeHomeFeedWhere(user, { col, sqlWhere });
    if (homeScope) where = homeScope;
  }

  return await db.Post.findAll({
    where,
    include: [
      {
        model: db.User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'tenant_id'],
        required: Boolean(where && Object.keys(where).length),
      },
    ],
    order: [['created_at', 'DESC']],
  });
}

// Get questions for feed
async function getQuestionsFeed(user_id, connectedUserIds, tenant_id, filterTenant) {
  const where = {};
  
  if (filterTenant) {
    where[Op.or] = [
      { '$asker.tenant_id$': tenant_id },
      { asked_by: { [Op.in]: connectedUserIds } }
    ];
  } else {
    where.asked_by = { [Op.in]: connectedUserIds };
  }

  return await db.GlobalQuestion.findAll({
    where,
    include: [
      {
        model: db.User,
        as: 'asker',
        attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'tenant_id']
      }
    ],
    order: [['created_at', 'DESC']]
  });
}

// Get jobs for feed
async function getJobsFeed(user_id, connectedUserIds, tenant_id, filterTenant) {
  const where = { is_active: true };
  
  if (filterTenant) {
    where[Op.or] = [
      { visibility: 'global' },
      { tenant_id },
      { posted_by: { [Op.in]: connectedUserIds } }
    ];
  } else {
    where[Op.or] = [
      { visibility: 'global' },
      { posted_by: { [Op.in]: connectedUserIds } }
    ];
  }

  return await db.JobPost.findAll({
    where,
    include: [
      {
        model: db.User,
        as: 'poster',
        attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'tenant_id']
      }
    ],
    order: [['created_at', 'DESC']]
  });
}

// Get events for feed
async function getEventsFeed(user_id, connectedUserIds, tenant_id, filterTenant) {
  const where = {};

  if (filterTenant) {
    where[Op.or] = [
      { visibility: 'global' },
      { tenant_id },
      { created_by: { [Op.in]: connectedUserIds } }
    ];
  } else {
    where[Op.or] = [
      { visibility: 'global' },
      { created_by: { [Op.in]: connectedUserIds } }
    ];
  }

  return await db.Event.findAll({
    where,
    include: [
      {
        model: db.User,
        as: 'creator',
        attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'tenant_id']
      }
    ],
    order: [['created_at', 'DESC']]
  });
}

// Calculate post score for ranking
function calculatePostScore(post, user_id, connectedUserIds) {
  let score = 0;
  
  // Base score from engagement
  score += (post.likes_count || 0) * 2;
  score += (post.comments_count || 0) * 3;
  score += (post.views_count || 0) * 0.1;
  
  // Connection bonus
  if (connectedUserIds.includes(post.user_id)) {
    score += 50;
  }
  
  // Recency bonus
  const hoursSinceCreation = (new Date() - new Date(post.created_at)) / (1000 * 60 * 60);
  score += Math.max(0, 24 - hoursSinceCreation);
  
  // Content type bonus
  if (post.type === 'question') score += 10;
  if (post.media_urls && post.media_urls.length > 0) score += 5;
  
  return score;
}

// Calculate question score for ranking
function calculateQuestionScore(question, user_id, connectedUserIds) {
  let score = 0;
  
  // Base score from engagement
  score += (question.answers_count || 0) * 5;
  score += (question.views_count || 0) * 0.1;
  
  // Connection bonus
  if (connectedUserIds.includes(question.asked_by)) {
    score += 50;
  }
  
  // Recency bonus
  const hoursSinceCreation = (new Date() - new Date(question.created_at)) / (1000 * 60 * 60);
  score += Math.max(0, 24 - hoursSinceCreation);
  
  // Unanswered questions get higher priority
  if (!question.answers_count || question.answers_count === 0) {
    score += 20;
  }
  
  return score;
}

// Calculate job score for ranking
function calculateJobScore(job, user_id, connectedUserIds) {
  let score = 0;
  
  // Base score from engagement
  score += (job.views_count || 0) * 0.1;
  score += (job.applications_count || 0) * 2;
  
  // Connection bonus
  if (connectedUserIds.includes(job.posted_by)) {
    score += 50;
  }
  
  // Recency bonus
  const hoursSinceCreation = (new Date() - new Date(job.created_at)) / (1000 * 60 * 60);
  score += Math.max(0, 24 - hoursSinceCreation);
  
  // Urgency bonus (deadline approaching)
  if (job.application_deadline) {
    const hoursUntilDeadline = (new Date(job.application_deadline) - new Date()) / (1000 * 60 * 60);
    if (hoursUntilDeadline > 0 && hoursUntilDeadline < 72) {
      score += 30;
    }
  }
  
  return score;
}

// Calculate event score for ranking
function calculateEventScore(event, user_id, connectedUserIds) {
  let score = 0;
  
  // Base score from engagement
  score += (event.participants_count || 0) * 2;
  score += (event.views_count || 0) * 0.1;
  
  // Connection bonus
  if (connectedUserIds.includes(event.created_by)) {
    score += 50;
  }
  
  // Urgency bonus (event approaching) — Event model uses `date` (DATEONLY)
  if (event.date) {
    const hoursUntilEvent = (new Date(`${event.date}T12:00:00`) - new Date()) / (1000 * 60 * 60);
    if (hoursUntilEvent > 0 && hoursUntilEvent < 168) { // 1 week
      score += 40;
    }
  }
  
  return score;
}

// Calculate trending score
function calculateTrendingScore(item) {
  const hoursSinceCreation = (new Date() - new Date(item.created_at)) / (1000 * 60 * 60);
  const engagement = item.content.likes_count || item.content.views_count || 0;
  
  // Trending formula: engagement / (time + 2)^1.5
  return engagement / Math.pow(hoursSinceCreation + 2, 1.5);
}

// Enrich feed items with additional data
async function enrichFeedItems(feedItems, user_id) {
  const enrichedItems = [];

  for (const item of feedItems) {
    let enrichedItem = { ...item };

    try {
      switch (item.type) {
        case 'post':
          enrichedItem.content = await enrichPost(item.content, user_id);
          break;
        case 'question':
          enrichedItem.content = await enrichQuestion(item.content, user_id);
          break;
        case 'job':
          enrichedItem.content = await enrichJob(item.content, user_id);
          break;
        case 'event':
          enrichedItem.content = await enrichEvent(item.content, user_id);
          break;
      }
    } catch (err) {
      console.error(`Error enriching ${item.type}:`, err);
    }

    enrichedItems.push(enrichedItem);
  }

  return enrichedItems;
}

// Enrich post with additional data
async function enrichPost(post, user_id) {
  const [likesCount, commentsCount, isLiked, isBookmarked] = await Promise.all([
    db.Like.count({ where: { post_id: post.id } }),
    db.Comment.count({ where: { post_id: post.id } }),
    db.Like.findOne({ where: { post_id: post.id, user_id } }),
    db.Bookmark.findOne({ where: { type: 'post', type_id: post.id, user_id } })
  ]);

  return {
    ...post.toJSON(),
    likes_count: likesCount,
    comments_count: commentsCount,
    is_liked: !!isLiked,
    is_bookmarked: !!isBookmarked
  };
}

// Enrich question with additional data
async function enrichQuestion(question, user_id) {
  const [answersCount, isBookmarked] = await Promise.all([
    db.GlobalAnswer.count({ where: { question_id: question.id } }),
    db.Bookmark.findOne({ where: { type: 'question', type_id: question.id, user_id } })
  ]);

  return {
    ...question.toJSON(),
    answers_count: answersCount,
    is_bookmarked: !!isBookmarked
  };
}

// Enrich job with additional data
async function enrichJob(job, user_id) {
  const [applicationsCount, hasApplied, isBookmarked] = await Promise.all([
    db.JobApplication.count({ where: { job_id: job.id } }),
    db.JobApplication.findOne({ where: { job_id: job.id, applicant_id: user_id } }),
    db.Bookmark.findOne({ where: { type: 'job', type_id: job.id, user_id } })
  ]);

  return {
    ...job.toJSON(),
    applications_count: applicationsCount,
    has_applied: !!hasApplied,
    is_bookmarked: !!isBookmarked
  };
}

// Enrich event with additional data
async function enrichEvent(event, user_id) {
  const [participantsCount, isParticipating, isBookmarked] = await Promise.all([
    db.EventParticipant.count({ where: { event_id: event.id } }),
    db.EventParticipant.findOne({ where: { event_id: event.id, user_id } }),
    db.Bookmark.findOne({ where: { type: 'event', type_id: event.id, user_id } })
  ]);

  return {
    ...event.toJSON(),
    participants_count: participantsCount,
    is_participating: !!isParticipating,
    is_bookmarked: !!isBookmarked
  };
}

// Get trending topics/hashtags for feed sidebar (recency + engagement weighted)
exports.getTrendingTopics = async (req, res) => {
  try {
    const postSince = new Date();
    postSince.setDate(postSince.getDate() - 21);
    const jobSince = new Date();
    jobSince.setDate(jobSince.getDate() - 60);
    const qSince = new Date();
    qSince.setDate(qSince.getDate() - 30);

    const homeScope = buildCollegeHomeFeedWhere(req.user, { col, sqlWhere });
    const postTimeWhere = { created_at: { [Op.gte]: postSince } };
    const postWhere = homeScope
      ? { [Op.and]: [postTimeWhere, homeScope] }
      : postTimeWhere;

    const posts = await db.Post.findAll({
      attributes: ['hashtags', 'likes_count', 'comments_count'],
      where: postWhere,
      include: homeScope
        ? [
            {
              model: db.User,
              as: 'user',
              attributes: ['id', 'tenant_id'],
              required: true,
            },
          ]
        : [],
      order: [['created_at', 'DESC']],
      limit: 400,
    });

    const hashtagCount = {};
    posts.forEach((post) => {
      const tags = Array.isArray(post.hashtags) ? post.hashtags : [];
      if (!tags.length) return;
      const engagement = 1 + Math.log(1 + (post.likes_count || 0) + (post.comments_count || 0));
      tags.forEach((tag) => {
        const t = String(tag).trim();
        if (!t) return;
        hashtagCount[t] = (hashtagCount[t] || 0) + engagement;
      });
    });

    const jobs = await db.JobPost.findAll({
      where: mergeTenantWhere(
        {
          is_active: true,
          created_at: { [Op.gte]: jobSince },
        },
        req.user,
      ),
      attributes: ['skills_required'],
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    const skillCount = {};
    jobs.forEach((job) => {
      const skills = Array.isArray(job.skills_required) ? job.skills_required : [];
      if (!skills.length) return;
      skills.forEach((skill) => {
        const s = String(skill).trim();
        if (!s) return;
        skillCount[s] = (skillCount[s] || 0) + 1;
      });
    });

    const questionWhere = { created_at: { [Op.gte]: qSince } };
    const questionInclude = [];
    const { shouldApplyTenantScope } = require('../utils/tenantScope');
    if (shouldApplyTenantScope(req.user)) {
      questionInclude.push({
        model: db.User,
        as: 'asker',
        attributes: [],
        required: true,
        where: { tenant_id: req.user.tenant_id },
      });
    }
    const questions = await db.GlobalQuestion.findAll({
      where: questionWhere,
      include: questionInclude,
      attributes: ['tags'],
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    const questionTagCount = {};
    questions.forEach((question) => {
      const qTags = Array.isArray(question.tags) ? question.tags : [];
      if (!qTags.length) return;
      qTags.forEach((tag) => {
        const t = String(tag).trim();
        if (!t) return;
        questionTagCount[t] = (questionTagCount[t] || 0) + 1;
      });
    });

    const trendingTopics = {
      hashtags: Object.entries(hashtagCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count: Math.round(count * 10) / 10, type: 'hashtag' })),
      skills: Object.entries(skillCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count, type: 'skill' })),
      question_tags: Object.entries(questionTagCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count, type: 'question_tag' })),
    };

    return res.status(200).json({
      status: true,
      data: trendingTopics,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching trending topics.',
      error: err.message,
    });
  }
};

/**
 * Home sidebar notice board: college-scoped official notices when user has tenant_id;
 * otherwise legacy community announcements (platform-wide demo).
 */
exports.getSidebarNotices = async (req, res) => {
  try {
    const limit = Math.min(10, Math.max(1, parseInt(String(req.query.limit), 10) || 5));
    const tenantId = req.user?.tenant_id ? String(req.user.tenant_id) : null;

    if (tenantId) {
      const rows = await db.TenantNotice.findAll({
        where: activeCollegeNoticeWhere(tenantId),
        include: [
          {
            model: db.Tenant,
            as: 'tenant',
            attributes: ['tenant_id', 'name'],
            required: false,
          },
          {
            model: db.User,
            as: 'author',
            attributes: ['id', 'first_name', 'last_name'],
            required: false,
          },
        ],
        order: [
          ['is_pinned', 'DESC'],
          ['starts_at', 'DESC'],
          ['created_at', 'DESC'],
        ],
        limit,
      });
      const notices = rows.map((row) => mapTenantNoticeForPublic(row, { bodyMax: 280 }));
      return res.status(200).json({ status: true, data: { notices } });
    }

    const rows = await db.CommunityPost.findAll({
      where: { is_announcement: true, is_deleted: false },
      include: [
        {
          model: db.Community,
          as: 'community',
          where: { is_active: true },
          attributes: ['id', 'name'],
          required: true,
        },
        {
          model: db.User,
          as: 'author',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
          required: false,
        },
      ],
      order: [
        ['is_pinned', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit,
    });

    const notices = rows.map((row) => {
      const p = row.get({ plain: true });
      const author = p.author || {};
      const authorName = [author.first_name, author.last_name].filter(Boolean).join(' ').trim() || 'Member';
      return {
        id: p.id,
        source: 'community',
        title: p.title || 'Announcement',
        body: (p.content || '').replace(/\s+/g, ' ').trim().slice(0, 280),
        body_full: (p.content || '').replace(/\s+/g, ' ').trim(),
        community_id: p.community_id,
        community_name: p.community?.name || 'Community',
        created_at: p.created_at,
        author_name: authorName,
        starts_at: p.created_at,
        ends_at: null,
        is_pinned: Boolean(p.is_pinned),
        college_name: null,
      };
    });

    return res.status(200).json({ status: true, data: { notices } });
  } catch (err) {
    console.error('getSidebarNotices', err);
    return res.status(500).json({
      status: false,
      message: 'Error fetching notices.',
      error: err.message,
    });
  }
};

/** All currently visible college notices (full body) for modal / notice center */
exports.getTenantNotices = async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id ? String(req.user.tenant_id) : null;
    if (!tenantId) {
      return res.status(200).json({ status: true, data: { notices: [] } });
    }
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const rows = await db.TenantNotice.findAll({
      where: activeCollegeNoticeWhere(tenantId),
      include: [
        { model: db.Tenant, as: 'tenant', attributes: ['tenant_id', 'name'], required: false },
        { model: db.User, as: 'author', attributes: ['id', 'first_name', 'last_name'], required: false },
      ],
      order: [
        ['is_pinned', 'DESC'],
        ['starts_at', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit,
    });
    const notices = rows.map((row) => mapTenantNoticeForPublic(row, { bodyMax: 50000 }));
    return res.status(200).json({ status: true, data: { notices } });
  } catch (err) {
    console.error('getTenantNotices', err);
    return res.status(500).json({
      status: false,
      message: 'Error fetching college notices.',
      error: err.message,
    });
  }
};

// Get feed recommendations for user
exports.getFeedRecommendations = async (req, res) => {
  const user_id = req.user.id;
  const { limit = 5 } = req.query;

  try {
    // Get user's interests based on their activity
    const userInterests = await getUserInterests(user_id);
    
    // Get recommended content based on interests
    const recommendations = await getContentRecommendations(req.user, userInterests, limit);

    return res.status(200).json({
      status: true,
      data: recommendations
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching feed recommendations.',
      error: err.message
    });
  }
};

// Get user interests based on activity
async function getUserInterests(user_id) {
  const interests = {
    hashtags: [],
    skills: [],
    topics: []
  };

  try {
    // Get hashtags from user's posts
    const userPosts = await db.Post.findAll({
      where: { user_id },
      attributes: ['hashtags']
    });

    userPosts.forEach(post => {
      if (post.hashtags) {
        interests.hashtags.push(...post.hashtags);
      }
    });

    // Get skills from user's job applications
    const userJobApplications = await db.JobApplication.findAll({
      where: { applicant_id: user_id },
      include: [{
        model: db.JobPost,
        as: 'job',
        attributes: ['skills_required']
      }]
    });

    userJobApplications.forEach(app => {
      if (app.job && app.job.skills_required) {
        interests.skills.push(...app.job.skills_required);
      }
    });

    // Get topics from user's questions
    const userQuestions = await db.GlobalQuestion.findAll({
      where: { asked_by: user_id },
      attributes: ['tags']
    });

    userQuestions.forEach(question => {
      if (question.tags) {
        interests.topics.push(...question.tags);
      }
    });

    // Count and sort interests
    const hashtagCount = {};
    interests.hashtags.forEach(tag => {
      hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
    });

    const skillCount = {};
    interests.skills.forEach(skill => {
      skillCount[skill] = (skillCount[skill] || 0) + 1;
    });

    const topicCount = {};
    interests.topics.forEach(topic => {
      topicCount[topic] = (topicCount[topic] || 0) + 1;
    });

    return {
      hashtags: Object.entries(hashtagCount).sort(([,a], [,b]) => b - a).slice(0, 5).map(([tag]) => tag),
      skills: Object.entries(skillCount).sort(([,a], [,b]) => b - a).slice(0, 5).map(([skill]) => skill),
      topics: Object.entries(topicCount).sort(([,a], [,b]) => b - a).slice(0, 5).map(([topic]) => topic)
    };
  } catch (err) {
    console.error('Error getting user interests:', err);
    return interests;
  }
}

// Get content recommendations based on interests
async function getContentRecommendations(user, interests, limit) {
  const recommendations = [];
  const user_id = user.id;
  const homeScope = buildCollegeHomeFeedWhere(user, { col, sqlWhere });

  try {
    // Get posts with matching hashtags
    if (interests.hashtags.length > 0) {
      const interestWhere = {
        user_id: { [Op.ne]: user_id },
        hashtags: { [Op.overlap]: interests.hashtags },
      };
      const postWhere = homeScope
        ? { [Op.and]: [interestWhere, homeScope] }
        : interestWhere;

      const recommendedPosts = await db.Post.findAll({
        where: postWhere,
        include: [{
          model: db.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'tenant_id'],
          required: Boolean(homeScope),
        }],
        limit: Math.ceil(limit / 3),
        order: [['created_at', 'DESC']]
      });

      recommendations.push(...recommendedPosts.map(post => ({
        type: 'post',
        content: post,
        reason: 'Based on your interests'
      })));
    }

    // Get jobs with matching skills
    if (interests.skills.length > 0) {
      const recommendedJobs = await db.JobPost.findAll({
        where: mergeTenantWhere(
          {
            is_active: true,
            posted_by: { [Op.ne]: user_id },
            skills_required: { [Op.overlap]: interests.skills },
          },
          user,
        ),
        include: [{
          model: db.User,
          as: 'poster',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture']
        }],
        limit: Math.ceil(limit / 3),
        order: [['created_at', 'DESC']]
      });

      recommendations.push(...recommendedJobs.map(job => ({
        type: 'job',
        content: job,
        reason: 'Based on your skills'
      })));
    }

    // Get questions with matching topics
    if (interests.topics.length > 0) {
      const recommendedQuestions = await db.GlobalQuestion.findAll({
        where: mergeTenantWhere(
          {
            asked_by: { [Op.ne]: user_id },
            tags: { [Op.overlap]: interests.topics },
          },
          user,
        ),
        include: [{
          model: db.User,
          as: 'asker',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture']
        }],
        limit: Math.ceil(limit / 3),
        order: [['created_at', 'DESC']]
      });

      recommendations.push(...recommendedQuestions.map(question => ({
        type: 'question',
        content: question,
        reason: 'Based on your topics'
      })));
    }

    // Shuffle and limit recommendations
    return recommendations
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);

  } catch (err) {
    console.error('Error getting content recommendations:', err);
    return [];
  }
}
