module.exports = (sequelize, DataTypes) => {
  const CommunityPost = sequelize.define(
    'CommunityPost',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      community_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Communities', key: 'id' },
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Tenants', key: 'tenant_id' },
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      title: {
        type: DataTypes.STRING(300),
        allowNull: false,
        defaultValue: '',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      likes_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      comments_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_announcement: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_pinned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'CommunityPosts',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  CommunityPost.associate = (models) => {
    CommunityPost.belongsTo(models.Community, { foreignKey: 'community_id', as: 'community' });
    CommunityPost.belongsTo(models.User, { foreignKey: 'user_id', as: 'author' });
    CommunityPost.hasMany(models.CommunityPostLike, { foreignKey: 'post_id', as: 'likes' });
    CommunityPost.hasMany(models.CommunityPostComment, {
      foreignKey: 'post_id',
      as: 'comments',
    });
    CommunityPost.hasMany(models.CommunityPostMention, {
      foreignKey: 'post_id',
      as: 'mentions',
    });
  };

  return CommunityPost;
};
