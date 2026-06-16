module.exports = (sequelize, DataTypes) => {
    const TeacherDetail = sequelize.define('TeacherDetail', {
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'Users', // References Users table
                key: 'id',
            },
        },
        department: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        designation: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        joining_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        qualification: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        experience_years: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        aadhar_number: {
            type: DataTypes.STRING(12),
            allowNull: true,
        },
        mother_tongue: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        highest_qualification: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        area_of_expertise: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
        },
        years_of_experience: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        courses_taught: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
        },
        research_interests: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        linkedin_profile: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        research_profile: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        resume_file: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        full_address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        village_town: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        pincode: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        country: {
            type: DataTypes.STRING(100),
            defaultValue: 'India',
        },
        alt_email: {
            type: DataTypes.STRING(255),
            allowNull: true,
            validate: { isEmail: true },
        },
        social_links: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        hobbies: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        available_for_mentorship: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        teaching_philosophy: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        publications: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        employee_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        faculty_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        specialization: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        id_document_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        employment_proof_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });

    TeacherDetail.associate = function (models) {
        TeacherDetail.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' }); 
        TeacherDetail.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' }); // ✅ Tenant instead of College
    };

    return TeacherDetail;
};
