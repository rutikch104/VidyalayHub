module.exports = (sequelize, DataTypes) => {
    const StudentDetail = sequelize.define('StudentDetail', {
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'Users', // Name of the referenced table
                key: 'id',
            },
        },
        degree: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        stream: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        year: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        semester: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        passout_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    });

    StudentDetail.associate = function (models) {
        StudentDetail.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return StudentDetail;
};