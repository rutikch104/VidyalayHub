module.exports = (sequelize, DataTypes) => {
  const InterviewType = sequelize.define(
    'InterviewType',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      slug: { type: DataTypes.STRING(64), allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      category: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'technical' },
      difficulty: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'medium' },
      duration_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
      question_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'InterviewTypes',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  InterviewType.associate = (models) => {
    InterviewType.hasMany(models.InterviewSession, { foreignKey: 'type_id', as: 'sessions' });
  };

  return InterviewType;
};
