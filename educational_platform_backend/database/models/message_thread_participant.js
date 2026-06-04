module.exports = (sequelize, DataTypes) => {
    const MessageThreadParticipant = sequelize.define('MessageThreadParticipant', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        thread_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'MessageThreads',
                key: 'id',
            },
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        role: {
            type: DataTypes.ENUM('admin', 'member'),
            defaultValue: 'member',
            allowNull: false,
        },
        joined_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        left_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        last_read_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        unread_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        muted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        pinned: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    });

    MessageThreadParticipant.associate = function (models) {
        MessageThreadParticipant.belongsTo(models.MessageThread, { foreignKey: 'thread_id', as: 'thread' });
        MessageThreadParticipant.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return MessageThreadParticipant;
};
