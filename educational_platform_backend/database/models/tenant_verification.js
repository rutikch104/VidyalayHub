module.exports = (sequelize, DataTypes) => {
    const TenantVerification = sequelize.define('TenantVerification', {  // ✅ Corrected model name
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
                model: 'Tenants', // ✅ Add reference for better integrity
                key: 'tenant_id',
            },
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true },
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.ENUM('admin'),
            allowNull: false,
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    });

    TenantVerification.associate = function (models) {
        TenantVerification.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    };

    return TenantVerification;
};
