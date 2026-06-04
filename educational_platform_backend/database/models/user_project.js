module.exports = (sequelize, DataTypes) => {
  const UserProject = sequelize.define(
    'UserProject',
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
      description: { type: DataTypes.TEXT, allowNull: true },
      technologies: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      status: { type: DataTypes.STRING(80), allowNull: true },
      image_url: { type: DataTypes.TEXT, allowNull: true },
      github_url: { type: DataTypes.STRING(500), allowNull: true },
      live_url: { type: DataTypes.STRING(500), allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'user_projects',
      timestamps: false,
    }
  );

  UserProject.associate = (models) => {
    UserProject.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return UserProject;
};
