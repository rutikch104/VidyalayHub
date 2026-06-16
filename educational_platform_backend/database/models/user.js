module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
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
        role_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Roles',
                key: 'id',
            },
        },
        user_type: {
            type: DataTypes.ENUM('student', 'teacher', 'alumni', 'staff'),
            allowNull: false,
        },
        first_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        last_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        gender: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        dob: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: { isEmail: true },
        },
        phone_number: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        password_hash: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        profile_picture: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        cover_picture: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        bio: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        location: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        linkedin_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        twitter_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        github_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        website_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        is_approved: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        registration_status: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: 'pending_approval',
        },
        registration_submitted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        registration_reviewed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        registration_reviewed_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        registration_rejection_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        registration_admin_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        college_email: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        app_settings: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: null,
        },
        password_changed_at: {
            type: DataTypes.DATE,
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

    // Define associations
    User.associate = function (models) {
        User.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
        User.belongsTo(models.Role, { foreignKey: 'role_id', as: 'roleRef' });
        User.hasOne(models.StudentDetail, { foreignKey: 'user_id', as: 'studentDetails' });
        User.hasOne(models.TeacherDetail, { foreignKey: 'user_id', as: 'teacherDetails' });
        User.hasOne(models.AlumniDetail, { foreignKey: 'user_id', as: 'alumniDetails' });
        User.hasOne(models.UserAbout, { foreignKey: 'user_id', as: 'userAbout' });
        User.hasMany(models.UserExperience, { foreignKey: 'user_id', as: 'userExperiences' });
        User.hasMany(models.UserAchievement, { foreignKey: 'user_id', as: 'userAchievements' });
        User.hasMany(models.UserSkill, { foreignKey: 'user_id', as: 'userSkills' });
        User.hasOne(models.UserTeachingInfo, { foreignKey: 'user_id', as: 'userTeachingInfo' });
        User.hasMany(models.UserProject, { foreignKey: 'user_id', as: 'userProjects' });
        User.hasMany(models.UserPublication, { foreignKey: 'user_id', as: 'userPublications' });
        User.hasMany(models.UserRegistrationDocument, { foreignKey: 'user_id', as: 'registrationDocuments' });
    };

    return User;
};
