const db = require('../database/index'); // Updated import
const { denyIfCrossTenant } = require('../utils/tenantScope');

// Add Comment
exports.addComment = async (req, res) => {
  try {
    const post_id = String(req.body?.post_id || '').trim();
    const user_id = String(req.body?.user_id || req.user?.id || '').trim();
    const text = String(req.body?.text || req.body?.content || '').trim();
    const parent_comment_id = req.body?.parent_comment_id || null;

    if (!post_id || !user_id || !text) {
      return res.status(400).json({ status: false, message: 'post_id, user_id and text are required.' });
    }

    const post = await db.Post.findByPk(post_id, { attributes: ['id', 'tenant_id'] });
    if (!post) return res.status(404).json({ status: false, message: 'Post not found.' });
    const denial = denyIfCrossTenant(req, post.tenant_id);
    if (denial) return res.status(denial.status).json({ status: false, message: denial.message });

    if (parent_comment_id) {
      const parent = await db.Comment.findOne({ where: { id: parent_comment_id, post_id } });
      if (!parent) return res.status(404).json({ status: false, message: 'Parent comment not found.' });
    }

    const comment = await db.Comment.create({
      post_id,
      user_id,
      tenant_id: post.tenant_id,
      text,
      parent_comment_id,
    });
    await post.increment('comments_count');
    const withUser = await db.Comment.findByPk(comment.id, {
      include: [{ model: db.User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'profile_picture'] }],
    });
    res.status(201).json({ status: true, message: 'Comment added', data: withUser });
  } catch (err) {
    console.error('Add Comment Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get All Comments
exports.getAllComments = async (req, res) => {
  try {
    const comments = await db.Comment.findAll({
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'name'] },
        { model: db.Post, as: 'post', attributes: ['id', 'content'] }
      ],
    });
    res.status(200).json(comments);
  } catch (err) {
    console.error('Get All Comments Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get Comments by Post
exports.getCommentsByPostId = async (req, res) => {
  try {
    const { post_id } = req.params;
    const comments = await db.Comment.findAll({
      where: { post_id },
      include: [{ model: db.User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'profile_picture'] }],
      order: [['created_at', 'ASC']],
    });
    const plain = comments.map((c) => (c.toJSON ? c.toJSON() : c));
    const byId = new Map();
    const roots = [];
    plain.forEach((c) => {
      c.replies = [];
      byId.set(String(c.id), c);
    });
    plain.forEach((c) => {
      if (c.parent_comment_id && byId.has(String(c.parent_comment_id))) byId.get(String(c.parent_comment_id)).replies.push(c);
      else roots.push(c);
    });
    res.status(200).json({ status: true, data: { comments: roots } });
  } catch (err) {
    console.error('Get Comments by Post Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update Comment
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const comment = await db.Comment.findByPk(id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.text = text;
    await comment.save();

    res.status(200).json({ message: 'Comment updated', comment });
  } catch (err) {
    console.error('Update Comment Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete Comment
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await db.Comment.findByPk(id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    await comment.destroy();
    res.status(200).json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Delete Comment Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};