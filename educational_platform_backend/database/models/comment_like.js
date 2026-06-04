module.exports = (sequelize, DataTypes) => {
  const CommentLike = sequelize.define(
    'CommentLike',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      comment_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Comments', key: 'id' },
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
    },
    {
      tableName: 'CommentLikes',
      indexes: [{ unique: true, fields: ['comment_id', 'user_id'] }],
    },
  );

  CommentLike.associate = function (models) {
    CommentLike.belongsTo(models.Comment, { foreignKey: 'comment_id', as: 'comment' });
    CommentLike.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return CommentLike;
};
