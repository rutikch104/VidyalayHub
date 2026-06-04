module.exports = (sequelize, DataTypes) => {
  const CommunityPostCommentMention = sequelize.define(
    'CommunityPostCommentMention',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      comment_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'CommunityPostComments', key: 'id' },
      },
      mentioned_user: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
    },
    {
      tableName: 'CommunityPostCommentMentions',
      underscored: true,
      timestamps: false,
    },
  );

  CommunityPostCommentMention.associate = (models) => {
    CommunityPostCommentMention.belongsTo(models.CommunityPostComment, {
      foreignKey: 'comment_id',
      as: 'comment',
    });
    CommunityPostCommentMention.belongsTo(models.User, {
      foreignKey: 'mentioned_user',
      as: 'mentionedUser',
    });
  };

  return CommunityPostCommentMention;
};
