module.exports = (sequelize, DataTypes) => {
  const CommunityPostLike = sequelize.define(
    'CommunityPostLike',
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
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
    },
    {
      tableName: 'CommunityPostLikes',
      underscored: true,
      timestamps: false,
      indexes: [{ unique: true, fields: ['post_id', 'user_id'] }],
    }
  );

  CommunityPostLike.associate = (models) => {
    CommunityPostLike.belongsTo(models.CommunityPost, { foreignKey: 'post_id', as: 'post' });
    CommunityPostLike.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return CommunityPostLike;
};
