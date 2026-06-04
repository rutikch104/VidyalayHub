module.exports = (sequelize, DataTypes) => {
  const UserExperience = sequelize.define(
    'UserExperience',
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
      title: { type: DataTypes.STRING(255), allowNull: false },
      company: { type: DataTypes.STRING(255), allowNull: true },
      duration: { type: DataTypes.STRING(255), allowNull: true },
      start_month: { type: DataTypes.SMALLINT, allowNull: true },
      start_year: { type: DataTypes.SMALLINT, allowNull: true },
      end_month: { type: DataTypes.SMALLINT, allowNull: true },
      end_year: { type: DataTypes.SMALLINT, allowNull: true },
      is_current_role: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'user_experiences',
      timestamps: false,
    }
  );

  UserExperience.associate = (models) => {
    UserExperience.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return UserExperience;
};
