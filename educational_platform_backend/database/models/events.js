module.exports = (sequelize, DataTypes) => {
    const Event = sequelize.define('Event', {
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
                model: 'Tenants', // Name of the referenced table
                key: 'tenant_id',
            },
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users', // Name of the referenced table
                key: 'id',
            },
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        start_time: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        visibility: {
            type: DataTypes.ENUM('college_only', 'global'),
            allowNull: false,
        },
        banner_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        event_type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'seminar',
        },
        category: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        max_participants: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: [],
        },
        is_online: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        meeting_link: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        registration_deadline: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        is_featured: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    });

    Event.associate = function (models) {
        Event.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
        Event.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
        Event.hasMany(models.EventParticipant, { foreignKey: 'event_id', as: 'participants' });
    };

    return Event;
};