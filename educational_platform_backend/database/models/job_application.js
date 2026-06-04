module.exports = (sequelize, DataTypes) => {
    const JobApplication = sequelize.define('JobApplication', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        job_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'JobPosts',
                key: 'id',
            },
        },
        applicant_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Tenants',
                key: 'tenant_id',
            },
        },
        cover_letter: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        resume_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        portfolio_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        linkedin_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        github_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        expected_salary: {
            type: DataTypes.JSONB,
            allowNull: true,
            // Store: { amount: number, currency: string, period: 'yearly'|'monthly'|'hourly' }
        },
        availability_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        additional_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected'),
            defaultValue: 'pending',
            allowNull: false,
        },
        feedback: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        interview_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        interview_location: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        interview_type: {
            type: DataTypes.ENUM('phone', 'video', 'onsite', 'assessment'),
            allowNull: true,
        },
        is_withdrawn: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        withdrawn_at: {
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

    JobApplication.associate = function (models) {
        JobApplication.belongsTo(models.JobPost, { foreignKey: 'job_id', as: 'job' });
        JobApplication.belongsTo(models.User, { foreignKey: 'applicant_id', as: 'applicant' });
    };

    return JobApplication;
};