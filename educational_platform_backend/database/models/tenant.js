module.exports = (sequelize, DataTypes) => {
    const Tenant = sequelize.define('Tenant', {
        tenant_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM('University', 'Engineering', 'Arts College'),
            allowNull: false,
        },
        affiliation: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        accreditation_status: {
            type: DataTypes.ENUM('NAAC A+', 'UGC Approved'),
            allowNull: true,
        },
        established_year: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        website: {
            type: DataTypes.STRING,
            validate: { isUrl: true },
            allowNull: true,
        },
        logo_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        about: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending',
        },
        slug: {
            type: DataTypes.STRING(64),
            allowNull: true,
            unique: true,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });

    Tenant.associate = function (models) {
        Tenant.hasMany(models.TenantAddress, { foreignKey: 'tenant_id', as: 'addresses' });
        Tenant.hasMany(models.TenantAdmin, { foreignKey: 'tenant_id', as: 'admins' });
        Tenant.hasMany(models.TenantAcademic, { foreignKey: 'tenant_id', as: 'academics' });
        Tenant.hasMany(models.TenantVerification, { foreignKey: 'tenant_id', as: 'verifications' });
        Tenant.hasMany(models.User, { foreignKey: 'tenant_id', as: 'users' }); // ➡️ Added association for Users
        Tenant.hasMany(models.TenantNotice, { foreignKey: 'tenant_id', sourceKey: 'tenant_id', as: 'notices' });
    };

    return Tenant;
};
