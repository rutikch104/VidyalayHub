module.exports = (sequelize, DataTypes) => {
  const UserAbout = sequelize.define(
    'UserAbout',
    {
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Users', key: 'id' },
      },
      bio: { type: DataTypes.TEXT, allowNull: true },
      location: { type: DataTypes.STRING(255), allowNull: true },
      headline: { type: DataTypes.STRING(255), allowNull: true },
      website: { type: DataTypes.STRING(500), allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'user_abouts',
      timestamps: false,
    }
  );

  UserAbout.associate = (models) => {
    UserAbout.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return UserAbout;
};
