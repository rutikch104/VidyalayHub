module.exports = (sequelize, DataTypes) => {
    const ResourceLibrary = sequelize.define('ResourceLibrary', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Tenants',
                key: 'tenant_id',
            },
        },
        subject: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        resource_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        file_url: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        file_size_bytes: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        uploaded_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users', // Name of the referenced table
                key: 'id',
            },
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
        },
        is_public: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        allowed_roles: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
        },
        likes_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        downloads_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        views_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        comments_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });

    ResourceLibrary.associate = function (models) {
        ResourceLibrary.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
        ResourceLibrary.belongsTo(models.User, { foreignKey: 'uploaded_by', as: 'uploader' });
        ResourceLibrary.hasMany(models.ResourceLibraryLike, {
            foreignKey: 'resource_id',
            as: 'likes',
        });
        ResourceLibrary.hasMany(models.ResourceLibraryReport, {
            foreignKey: 'resource_id',
            as: 'reports',
        });
    };

    return ResourceLibrary;
};