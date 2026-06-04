module.exports = (sequelize, DataTypes) => {
    const NotificationSetting = sequelize.define('NotificationSetting', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
            unique: true,
        },
        email_notifications: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        push_notifications: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        in_app_notifications: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        sms_notifications: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        notification_types: {
            type: DataTypes.JSONB,
            defaultValue: {
                // Social interactions
                social: {
                    follow: true,
                    comment: true,
                    like: true,
                    mention: true,
                    post_share: true
                },
                // Professional activities
                professional: {
                    connection_request: true,
                    job_application: true,
                    endorsement: true,
                    skill_endorsement: true,
                    answer: true
                },
                // Communication
                messages: {
                    message: true,
                    group_invite: true
                },
                // Learning & achievements
                learning: {
                    course_enrollment: true,
                    certification_earned: true,
                    achievement_unlocked: true,
                    event_reminder: true
                },
                // System notifications
                system: {
                    updates: true,
                    security: true,
                    maintenance: true
                }
            }
        },
        email_frequency: {
            type: DataTypes.ENUM('immediate', 'daily_digest', 'weekly_digest'),
            defaultValue: 'immediate',
        },
        quiet_hours: {
            type: DataTypes.JSONB,
            defaultValue: {
                enabled: false,
                start_time: '22:00',
                end_time: '08:00',
                timezone: 'UTC'
            }
        },
        do_not_disturb: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
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

    NotificationSetting.associate = function (models) {
        NotificationSetting.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return NotificationSetting;
};