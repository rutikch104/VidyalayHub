const db = require('../database/index'); // Updated import

// Add Like
exports.addLike = async (req, res) => {
  try {
    const { post_id, user_id } = req.body;

    // Prevent duplicate like
    const alreadyLiked = await db.Like.findOne({ where: { post_id, user_id } });
    if (alreadyLiked) return res.status(400).json({ message: 'Already liked.' });

    const like = await db.Like.create({ post_id, user_id });
    res.status(201).json({ message: 'Post liked.', like });
  } catch (err) {
    console.error('Add Like Error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get All Likes
exports.getAllLikes = async (req, res) => {
  try {
    const likes = await db.Like.findAll({
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'name'] },
        { model: db.Post, as: 'post', attributes: ['id', 'content'] },
      ],
    });
    res.status(200).json(likes);
  } catch (err) {
    console.error('Get All Likes Error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get Likes By Post ID
exports.getLikesByPostId = async (req, res) => {
  try {
    const post_id = req.params.post_id;

    const likes = await db.Like.findAll({
      where: { post_id },
      include: [{ model: db.User, as: 'user', attributes: ['id', 'name'] }],
    });

    res.status(200).json(likes);
  } catch (err) {
    console.error('Get Likes by Post Error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Remove Like
exports.removeLike = async (req, res) => {
  try {
    const { post_id, user_id } = req.body;

    const like = await db.Like.findOne({ where: { post_id, user_id } });
    if (!like) return res.status(404).json({ message: 'Like not found.' });

    await like.destroy();
    res.status(200).json({ message: 'Like removed.' });
  } catch (err) {
    console.error('Remove Like Error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};