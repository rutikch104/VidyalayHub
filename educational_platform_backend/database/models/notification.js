module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('Notification', {
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
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Tenants', key: 'tenant_id' },
        },
        type: {
            type: DataTypes.ENUM(
                'follow', 'comment', 'answer', 'like', 'mention', 'message', 
                'group_invite', 'connection_request', 'job_application', 
                'endorsement', 'skill_endorsement', 'post_share', 'event_reminder',
                'course_enrollment', 'certification_earned', 'achievement_unlocked'
            ),
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        link_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
            // Store additional data like: { actor_id, target_id, content_preview, etc. }
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        read_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        priority: {
            type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
            defaultValue: 'normal',
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            // For time-sensitive notifications
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

    Notification.associate = function (models) {
        Notification.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return Notification;
};