module.exports = (sequelize, DataTypes) => {
    const AlumniDetail = sequelize.define('AlumniDetail', {
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'Users', // Name of the referenced table
                key: 'id',
            },
        },
        aadhar_number: {
            type: DataTypes.STRING(12),
            allowNull: true,
        },
        mother_tongue: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        degree: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        stream: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        year_of_admission: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        year_of_graduation: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        roll_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        academic_achievements: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        current_job_title: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        company_name: {
            type: DataTypes.STRING(150),
            allowNull: true,
        },
        industry: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        work_experience: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        skills: {
            type: DataTypes.ARRAY(DataTypes.STRING), // Ensure compatibility with your database
            allowNull: true,
        },
        linkedin_profile: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: { isUrl: true },
        },
        github_portfolio: {
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
            validate: { isNumeric: true, len: [6, 10] },
        },
        country: {
            type: DataTypes.STRING(100),
            defaultValue: 'India',
        },
        father_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        mother_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        parent_phone_number: {
            type: DataTypes.STRING(15),
            allowNull: true,
        },
        alt_email: {
            type: DataTypes.STRING(255),
            allowNull: true,
            validate: { isEmail: true },
        },
        social_links: {
            type: DataTypes.JSONB, // Ensure compatibility with your database
            allowNull: true,
        },
        hobbies: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        willing_to_mentor: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        alumni_achievements: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        profile_picture: {
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

    AlumniDetail.associate = function (models) {
        AlumniDetail.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        AlumniDetail.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    };

    return AlumniDetail;
};