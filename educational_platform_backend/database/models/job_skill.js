module.exports = (sequelize, DataTypes) => {
  const JobSkill = sequelize.define(
    'JobSkill',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      job_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'JobPosts', key: 'id' },
      },
      skill_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'skills', key: 'id' },
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'job_skills',
      timestamps: false,
    },
  );

  JobSkill.associate = (models) => {
    JobSkill.belongsTo(models.JobPost, { foreignKey: 'job_id', as: 'job' });
    JobSkill.belongsTo(models.Skill, { foreignKey: 'skill_id', as: 'skill' });
  };

  return JobSkill;
};
