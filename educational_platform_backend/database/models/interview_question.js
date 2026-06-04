module.exports = (sequelize, DataTypes) => {
  const InterviewQuestion = sequelize.define(
    'InterviewQuestion',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      session_id: { type: DataTypes.UUID, allowNull: false },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      prompt: { type: DataTypes.TEXT, allowNull: false },
      question_type: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'general' },
      difficulty: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'medium' },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'InterviewQuestions',
      timestamps: false,
    },
  );

  InterviewQuestion.associate = (models) => {
    InterviewQuestion.belongsTo(models.InterviewSession, { foreignKey: 'session_id', as: 'session' });
    InterviewQuestion.hasOne(models.InterviewAnswer, { foreignKey: 'question_id', as: 'answer' });
  };

  return InterviewQuestion;
};
