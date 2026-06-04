module.exports = (sequelize, DataTypes) => {
    const MessageThread = sequelize.define('MessageThread', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        thread_type: {
            type: DataTypes.ENUM('direct', 'group'),
            defaultValue: 'direct',
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
            // For group chats
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            // For group chats
        },
        avatar_url: {
            type: DataTypes.STRING,
            allowNull: true,
            // For group chats
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Tenants', key: 'tenant_id' },
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
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
        last_message_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    });

    MessageThread.associate = function (models) {
        MessageThread.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
        MessageThread.hasMany(models.Message, { foreignKey: 'thread_id', as: 'messages' });
        MessageThread.hasMany(models.MessageThreadParticipant, { foreignKey: 'thread_id', as: 'participants' });
    };

    return MessageThread;
};