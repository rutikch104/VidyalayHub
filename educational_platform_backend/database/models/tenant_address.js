module.exports = (sequelize, DataTypes) => {
    const TenantAddress = sequelize.define('TenantAddress', {
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
        full_address: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        city: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        state: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        pincode: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        country: {
            type: DataTypes.STRING,
            defaultValue: 'India',
        },
        campus_locations: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    });

    TenantAddress.associate = function (models) {
        TenantAddress.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    };

    return TenantAddress;
};
