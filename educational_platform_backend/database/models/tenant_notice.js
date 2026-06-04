module.exports = (sequelize, DataTypes) => {
  const TenantNotice = sequelize.define(
    'TenantNotice',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'tenant_id' },
      },
      created_by_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      title: {
        type: DataTypes.STRING(400),
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      starts_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      ends_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_pinned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_archived: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'TenantNotices',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  TenantNotice.associate = (models) => {
    TenantNotice.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      targetKey: 'tenant_id',
      as: 'tenant',
    });
    TenantNotice.belongsTo(models.User, {
      foreignKey: 'created_by_user_id',
      as: 'author',
    });
  };

  return TenantNotice;
};
