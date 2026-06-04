module.exports = (sequelize, DataTypes) => {
    const TenantAcademic = sequelize.define('TenantAcademic', {
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
        programs_offered: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
        },
        streams_offered: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
        },
        student_capacity: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        faculty_strength: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        library_facility: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        lab_facility: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        sports_facility: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
    });

    TenantAcademic.associate = function (models) {
        TenantAcademic.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    };

    return TenantAcademic;
};
