module.exports = (sequelize, DataTypes) => {
  const InterviewSession = sequelize.define(
    'InterviewSession',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: { type: DataTypes.UUID, allowNull: false },
      tenant_id: { type: DataTypes.UUID, allowNull: true },
      type_id: { type: DataTypes.UUID, allowNull: false },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'in_progress' },
      overall_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      summary_feedback: { type: DataTypes.TEXT, allowNull: true },
      report_json: { type: DataTypes.JSONB, allowNull: true },
      current_question_index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      started_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      completed_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'InterviewSessions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  InterviewSession.associate = (models) => {
    InterviewSession.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    InterviewSession.belongsTo(models.InterviewType, { foreignKey: 'type_id', as: 'type' });
    InterviewSession.hasMany(models.InterviewQuestion, { foreignKey: 'session_id', as: 'questions' });
    InterviewSession.hasMany(models.InterviewAnswer, { foreignKey: 'session_id', as: 'answers' });
  };

  return InterviewSession;
};
