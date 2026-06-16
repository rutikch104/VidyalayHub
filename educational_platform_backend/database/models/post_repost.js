module.exports = (sequelize, DataTypes) => {
  const PostRepost = sequelize.define(
    'PostRepost',
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
        references: {
          model: 'Posts',
          key: 'id',
        },
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      amplify_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'PostReposts',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { unique: true, fields: ['post_id', 'user_id'] },
        { fields: ['post_id', 'created_at'] },
      ],
    },
  );

  PostRepost.associate = (models) => {
    PostRepost.belongsTo(models.Post, { foreignKey: 'post_id', as: 'post' });
    PostRepost.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return PostRepost;
};
