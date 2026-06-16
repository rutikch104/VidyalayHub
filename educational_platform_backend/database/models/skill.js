module.exports = (sequelize, DataTypes) => {
  const Skill = sequelize.define(
    'Skill',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      skill_name: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      normalized_name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      usage_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'skills',
      timestamps: false,
    },
  );

  Skill.associate = (models) => {
    Skill.hasMany(models.UserSkill, { foreignKey: 'skill_id', as: 'userSkills' });
    Skill.hasMany(models.JobSkill, { foreignKey: 'skill_id', as: 'jobSkills' });
  };

  return Skill;
};
