module.exports = (sequelize, DataTypes) => {
  const ResourceLibraryLike = sequelize.define(
    'ResourceLibraryLike',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      resource_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'ResourceLibraries', key: 'id' },
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
    },
    {
      tableName: 'ResourceLibraryLikes',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [{ unique: true, fields: ['resource_id', 'user_id'] }],
    },
  );

  ResourceLibraryLike.associate = (models) => {
    ResourceLibraryLike.belongsTo(models.ResourceLibrary, {
      foreignKey: 'resource_id',
      as: 'resource',
    });
    ResourceLibraryLike.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return ResourceLibraryLike;
};
