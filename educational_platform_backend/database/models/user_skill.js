module.exports = (sequelize, DataTypes) => {
  const UserSkill = sequelize.define(
    'UserSkill',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      skill_name: { type: DataTypes.STRING(200), allowNull: false },
      level: { type: DataTypes.INTEGER, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'user_skills',
      timestamps: false,
    }
  );

  UserSkill.associate = (models) => {
    UserSkill.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return UserSkill;
};
