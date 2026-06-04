module.exports = (sequelize, DataTypes) => {
  const UserFollow = sequelize.define(
    'UserFollow',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      follower_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      following_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'UserFollows',
      timestamps: false,
      indexes: [
        { unique: true, fields: ['follower_id', 'following_id'] },
        { fields: ['follower_id'] },
        { fields: ['following_id'] },
      ],
    },
  );

  UserFollow.associate = (models) => {
    UserFollow.belongsTo(models.User, { foreignKey: 'follower_id', as: 'follower' });
    UserFollow.belongsTo(models.User, { foreignKey: 'following_id', as: 'following' });
  };

  return UserFollow;
};
