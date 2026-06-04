module.exports = (sequelize, DataTypes) => {
    const Bookmark = sequelize.define('Bookmark', {
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
                model: 'Users', // Name of the referenced table
                key: 'id',
            },
        },
        type: {
            type: DataTypes.ENUM('question', 'answer', 'post', 'course', 'resource', 'event', 'job', 'community_post'),
            allowNull: false,
        },
        type_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Tenants',
                key: 'tenant_id',
            },
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        indexes: [
            {
                unique: true,
                name: 'bookmarks_user_type_typeid_unique',
                fields: ['user_id', 'type', 'type_id'],
            },
        ],
    });

    Bookmark.associate = function (models) {
        Bookmark.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return Bookmark;
};