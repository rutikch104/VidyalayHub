module.exports = (sequelize, DataTypes) => {
  const ResourceLibraryReport = sequelize.define(
    'ResourceLibraryReport',
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
      reported_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    {
      tableName: 'ResourceLibraryReports',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  ResourceLibraryReport.associate = (models) => {
    ResourceLibraryReport.belongsTo(models.ResourceLibrary, {
      foreignKey: 'resource_id',
      as: 'resource',
    });
    ResourceLibraryReport.belongsTo(models.User, {
      foreignKey: 'reported_by',
      as: 'reporter',
    });
  };

  return ResourceLibraryReport;
};
