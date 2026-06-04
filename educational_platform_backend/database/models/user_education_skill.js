module.exports = (sequelize, DataTypes) => {
  const UserEducationSkill = sequelize.define(
    'UserEducationSkill',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      education_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'user_educations', key: 'id' },
      },
      skill_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'skills', key: 'id' },
      },
      skill_name: { type: DataTypes.STRING(120), allowNull: false },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'user_education_skills',
      timestamps: false,
    },
  );

  UserEducationSkill.associate = (models) => {
    UserEducationSkill.belongsTo(models.UserEducation, {
      foreignKey: 'education_id',
      as: 'education',
    });
    UserEducationSkill.belongsTo(models.Skill, { foreignKey: 'skill_id', as: 'skill' });
  };

  return UserEducationSkill;
};
