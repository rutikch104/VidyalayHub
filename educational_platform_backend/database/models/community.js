module.exports = (sequelize, DataTypes) => {
  const Community = sequelize.define(
    'Community',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'General',
      },
      avatar_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      cover_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      member_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      post_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_private: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_featured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      rules: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Tenants', key: 'tenant_id' },
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'Communities',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  Community.associate = (models) => {
    Community.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    Community.hasMany(models.CommunityMember, { foreignKey: 'community_id', as: 'memberRecords' });
    Community.hasMany(models.CommunityPost, { foreignKey: 'community_id', as: 'posts' });
  };

  return Community;
};
