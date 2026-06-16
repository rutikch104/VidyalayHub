module.exports = (sequelize, DataTypes) => {
    const StudentDetail = sequelize.define('StudentDetail', {
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'Users',
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
        roll_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        student_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        university_reg_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        division: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        admission_year: {
            type: DataTypes.SMALLINT,
            allowNull: true,
        },
        expected_graduation_year: {
            type: DataTypes.SMALLINT,
            allowNull: true,
        },
        cgpa: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        percentage: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        id_document_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        admission_letter_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        academic_batch: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        college_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
    });

    StudentDetail.associate = function (models) {
        StudentDetail.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return StudentDetail;
};
