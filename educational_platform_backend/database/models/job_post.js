module.exports = (sequelize, DataTypes) => {
    const JobPost = sequelize.define('JobPost', {
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
                model: 'Tenants',
                key: 'tenant_id',
            },
        },
        posted_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        company_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        company_logo: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        category: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: 'full_time',
        },
        job_type: {
            type: DataTypes.ENUM('full-time', 'part-time', 'intern', 'contract', 'freelance'),
            allowNull: false,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        requirements: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            allowNull: true,
            defaultValue: [],
        },
        responsibilities: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            allowNull: true,
            defaultValue: [],
        },
        benefits: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            allowNull: true,
            defaultValue: [],
        },
        salary_range: {
            type: DataTypes.JSONB,
            allowNull: true,
            // Store: { min: number, max: number, currency: string, period: 'yearly'|'monthly'|'hourly' }
        },
        experience_level: {
            type: DataTypes.ENUM('entry', 'junior', 'mid-level', 'senior', 'lead', 'executive'),
            allowNull: false,
            defaultValue: 'entry',
        },
        education_level: {
            type: DataTypes.ENUM('high_school', 'associate', 'bachelor', 'master', 'phd', 'other'),
            allowNull: false,
            defaultValue: 'bachelor',
        },
        skills_required: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
            defaultValue: [],
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
            defaultValue: [],
        },
        apply_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        application_deadline: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        is_remote: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        visa_sponsorship: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        relocation_assistance: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        contact_email: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: { isEmail: true },
        },
        contact_phone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        views_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        applications_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        visibility: {
            type: DataTypes.ENUM('college_only', 'global'),
            allowNull: false,
            defaultValue: 'college_only',
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    });

    JobPost.associate = function (models) {
        JobPost.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
        JobPost.belongsTo(models.User, { foreignKey: 'posted_by', as: 'poster' });
        JobPost.hasMany(models.JobApplication, { foreignKey: 'job_id', as: 'applications' });
    };

    return JobPost;
};