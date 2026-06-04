module.exports = (sequelize, DataTypes) => {
  const UserTeachingInfo = sequelize.define(
    'UserTeachingInfo',
    {
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Users', key: 'id' },
      },
      subjects: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      experience_years: { type: DataTypes.DECIMAL(6, 1), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'user_teaching_infos',
      timestamps: false,
    }
  );

  UserTeachingInfo.associate = (models) => {
    UserTeachingInfo.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return UserTeachingInfo;
};
