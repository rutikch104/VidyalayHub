module.exports = (sequelize, DataTypes) => {
    const TenantAdmin = sequelize.define('TenantAdmin', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Tenants', // ✅ Proper foreign key reference
                key: 'tenant_id',
            },
        },
        full_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true },
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        department: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    });

    TenantAdmin.associate = function (models) {
        TenantAdmin.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    };

    return TenantAdmin;
};
