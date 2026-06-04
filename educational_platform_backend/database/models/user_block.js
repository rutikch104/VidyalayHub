module.exports = (sequelize, DataTypes) => {
    const UserBlock = sequelize.define('UserBlock', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        blocker_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        blocked_user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            // Reason for blocking the user
        },
        block_type: {
            type: DataTypes.ENUM('temporary', 'permanent'),
            defaultValue: 'permanent',
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            // For temporary blocks
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

    UserBlock.associate = function (models) {
        UserBlock.belongsTo(models.User, { foreignKey: 'blocker_id', as: 'blocker' });
        UserBlock.belongsTo(models.User, { foreignKey: 'blocked_user_id', as: 'blockedUser' });
    };

    return UserBlock;
};
