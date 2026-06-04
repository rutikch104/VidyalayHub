module.exports = (sequelize, DataTypes) => {
    const Connection = sequelize.define('Connection', {
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
        scope: {
            type: DataTypes.ENUM('college', 'global'),
            allowNull: false,
            defaultValue: 'college',
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
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
            // Personal message with connection request
        },
        status: {
            type: DataTypes.ENUM('pending', 'accepted', 'declined', 'withdrawn', 'removed'),
            defaultValue: 'pending',
            allowNull: false,
        },
        decline_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            // Reason for declining connection
        },
        requested_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        responded_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        connection_strength: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            // 1 = Direct connection, 2 = 2nd degree, etc.
        },
        mutual_connections: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        last_interaction: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
            defaultValue: [],
            // Custom tags for organizing connections
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            // Personal notes about the connection
        },
        is_favorite: {
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

    Connection.associate = function (models) {
        Connection.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });
        Connection.belongsTo(models.User, { foreignKey: 'receiver_id', as: 'receiver' });
    };

    return Connection;
};