module.exports = (sequelize, DataTypes) => {
  const CommunityPostMention = sequelize.define(
    'CommunityPostMention',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      post_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'CommunityPosts', key: 'id' },
      },
      mentioned_user: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
    },
    {
      tableName: 'CommunityPostMentions',
      underscored: true,
      timestamps: false,
    },
  );

  CommunityPostMention.associate = (models) => {
    CommunityPostMention.belongsTo(models.CommunityPost, { foreignKey: 'post_id', as: 'post' });
    CommunityPostMention.belongsTo(models.User, {
      foreignKey: 'mentioned_user',
      as: 'mentionedUser',
    });
  };

  return CommunityPostMention;
};
