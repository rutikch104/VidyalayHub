module.exports = (sequelize, DataTypes) => {
  const MediaAsset = sequelize.define(
    'MediaAsset',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      owner_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Tenants', key: 'tenant_id' },
      },
      category: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      entity_type: {
        type: DataTypes.STRING(48),
        allowNull: true,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      storage_key: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      public_url: {
        type: DataTypes.STRING(1024),
        allowNull: false,
      },
      mime_type: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      size_bytes: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      original_name: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      media_type: {
        type: DataTypes.STRING(24),
        allowNull: true,
      },
      thumbnail_url: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      provider: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'local',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'MediaAssets',
      updatedAt: false,
      indexes: [
        { fields: ['owner_id'] },
        { fields: ['tenant_id'] },
        { fields: ['entity_type', 'entity_id'] },
        { fields: ['storage_key'], unique: true },
        { fields: ['category'] },
      ],
    },
  );

  MediaAsset.associate = function (models) {
    MediaAsset.belongsTo(models.User, { foreignKey: 'owner_id', as: 'owner' });
  };

  return MediaAsset;
};
