module.exports = (sequelize, DataTypes) => {
  const UserPublication = sequelize.define(
    'UserPublication',
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
      title: { type: DataTypes.STRING(500), allowNull: false },
      venue: { type: DataTypes.STRING(500), allowNull: true },
      year: { type: DataTypes.STRING(16), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      url: { type: DataTypes.STRING(500), allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'user_publications',
      timestamps: false,
    }
  );

  UserPublication.associate = (models) => {
    UserPublication.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return UserPublication;
};
