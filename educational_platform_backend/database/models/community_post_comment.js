module.exports = (sequelize, DataTypes) => {
  const CommunityPostComment = sequelize.define(
    'CommunityPostComment',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      post_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'CommunityPosts', key: 'id' },
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
      parent_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'CommunityPostComments', key: 'id' },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'CommunityPostComments',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  CommunityPostComment.associate = (models) => {
    CommunityPostComment.belongsTo(models.CommunityPost, {
      foreignKey: 'post_id',
      as: 'post',
    });
    CommunityPostComment.belongsTo(models.Community, {
      foreignKey: 'community_id',
      as: 'community',
    });
    CommunityPostComment.belongsTo(models.User, { foreignKey: 'user_id', as: 'author' });
    CommunityPostComment.belongsTo(models.CommunityPostComment, {
      foreignKey: 'parent_id',
      as: 'parent',
    });
    CommunityPostComment.hasMany(models.CommunityPostComment, {
      foreignKey: 'parent_id',
      as: 'replies',
    });
    CommunityPostComment.hasMany(models.CommunityPostCommentMention, {
      foreignKey: 'comment_id',
      as: 'mentions',
    });
  };

  return CommunityPostComment;
};
