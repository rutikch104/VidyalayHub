module.exports = (sequelize, DataTypes) => {
  const UserEducation = sequelize.define(
    'UserEducation',
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
      institution_name: { type: DataTypes.STRING(500), allowNull: false },
      degree: { type: DataTypes.STRING(255), allowNull: true },
      field_of_study: { type: DataTypes.STRING(255), allowNull: true },
      start_month: { type: DataTypes.SMALLINT, allowNull: true },
      start_year: { type: DataTypes.SMALLINT, allowNull: true },
      end_month: { type: DataTypes.SMALLINT, allowNull: true },
      end_year: { type: DataTypes.SMALLINT, allowNull: true },
      is_current_studying: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      duration: { type: DataTypes.STRING(255), allowNull: true },
      cgpa: { type: DataTypes.STRING(32), allowNull: true },
      percentage: { type: DataTypes.STRING(32), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      achievements: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'user_educations',
      timestamps: false,
    },
  );

  UserEducation.associate = (models) => {
    UserEducation.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    UserEducation.hasMany(models.UserEducationSkill, {
      foreignKey: 'education_id',
      as: 'educationSkills',
    });
  };

  return UserEducation;
};
