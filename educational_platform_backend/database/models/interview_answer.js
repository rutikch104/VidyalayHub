module.exports = (sequelize, DataTypes) => {
  const InterviewAnswer = sequelize.define(
    'InterviewAnswer',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      question_id: { type: DataTypes.UUID, allowNull: false },
      session_id: { type: DataTypes.UUID, allowNull: false },
      answer_text: { type: DataTypes.TEXT, allowNull: false },
      score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      feedback_text: { type: DataTypes.TEXT, allowNull: true },
      feedback_json: { type: DataTypes.JSONB, allowNull: true },
      answered_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'InterviewAnswers',
      timestamps: false,
    },
  );

  InterviewAnswer.associate = (models) => {
    InterviewAnswer.belongsTo(models.InterviewQuestion, { foreignKey: 'question_id', as: 'question' });
    InterviewAnswer.belongsTo(models.InterviewSession, { foreignKey: 'session_id', as: 'session' });
  };

  return InterviewAnswer;
};
