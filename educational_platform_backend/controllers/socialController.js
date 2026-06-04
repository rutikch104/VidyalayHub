const db = require('../database/index');
const { Op } = require('sequelize');
const { extractHashtagsFromContent } = require('../utils/hashtagUtils');

exports.searchHashtags = async (req, res) => {
  try {
    const qRaw = typeof req.query.q === 'string' ? req.query.q.trim().replace(/^#/, '') : '';
    const qLower = qRaw.toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

        const [questions, answers, posts, communityPosts] = await Promise.all([
            db.GlobalQuestion.findAll({
                attributes: ['tags'],
                where: { tags: { [Op.ne]: [] } },
            }),
            db.GlobalAnswer.findAll({
                attributes: ['tags'],
                where: { tags: { [Op.ne]: [] } },
            }),
            db.Post.findAll({
                attributes: ['hashtags'],
                where: { hashtags: { [Op.ne]: [] } },
            }),
            db.CommunityPost.findAll({
                attributes: ['tags'],
                where: { tags: { [Op.ne]: [] }, is_deleted: false },
            }),
        ]);

    const tagCount = new Map();
    const ingest = (tag) => {
      const name = String(tag || '').trim().replace(/^#+/, '');
      if (!name) return;
      const key = name.toLowerCase();
      const existing = tagCount.get(key);
      if (existing) existing.count += 1;
      else tagCount.set(key, { tag: name, count: 1 });
    };

    questions.forEach((row) => (row.tags || []).forEach(ingest));
    answers.forEach((row) => (row.tags || []).forEach(ingest));
        posts.forEach((row) => (row.hashtags || []).forEach(ingest));
        communityPosts.forEach((row) => (row.tags || []).forEach(ingest));

    let popular = [...tagCount.values()].sort((a, b) => b.count - a.count);
    if (qLower) {
      popular = popular.filter((entry) => entry.tag.toLowerCase().startsWith(qLower));
    }
    popular = popular.slice(0, limit);

    return res.status(200).json({ status: true, data: popular });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching hashtags',
      error: err.message,
    });
  }
};
