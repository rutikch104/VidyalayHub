module.exports = (sequelize, DataTypes) => {
    const Message = sequelize.define('Message', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Tenants', key: 'tenant_id' },
        },
        thread_id: {
            type: DataTypes.UUID,
            allowNull: true, // Optional if using sender_id + receiver_id
            references: {
                model: 'MessageThreads',
                key: 'id',
            },
        },
        sender_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        receiver_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        message_type: {
            type: DataTypes.ENUM('text', 'image', 'video', 'file', 'audio'),
            defaultValue: 'text',
            allowNull: false,
        },
        media_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        media_metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
            // Store file info: { originalName, size, mimetype, duration (for audio/video) }
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        read_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        reply_to_message_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Messages',
                key: 'id',
            },
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

    Message.associate = function (models) {
        Message.belongsTo(models.MessageThread, { foreignKey: 'thread_id', as: 'thread' });
        Message.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });
        Message.belongsTo(models.User, { foreignKey: 'receiver_id', as: 'receiver' });
        Message.belongsTo(models.Message, { foreignKey: 'reply_to_message_id', as: 'replyTo' });
        Message.hasMany(models.Message, { foreignKey: 'reply_to_message_id', as: 'replies' });
    };

    return Message;
};