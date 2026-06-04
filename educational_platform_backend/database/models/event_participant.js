module.exports = (sequelize, DataTypes) => {
    const EventParticipant = sequelize.define('EventParticipant', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        event_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Events', // Name of the referenced table
                key: 'id',
            },
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users', // Name of the referenced table
                key: 'id',
            },
        },
        status: {
            type: DataTypes.ENUM('interested', 'going', 'not going'),
            defaultValue: 'interested',
        },
        joined_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        indexes: [
            {
                unique: true,
                name: 'event_participants_event_user_unique',
                fields: ['event_id', 'user_id'],
            },
        ],
    });

    EventParticipant.associate = function (models) {
        EventParticipant.belongsTo(models.Event, { foreignKey: 'event_id', as: 'event' });
        EventParticipant.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return EventParticipant;
};