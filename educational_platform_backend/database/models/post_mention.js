module.exports = (sequelize, DataTypes) => {
    const PostMention = sequelize.define('PostMention', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        post_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Posts',
                key: 'id',
            },
        },
        mentioned_user_id: {
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
        }
    });

    PostMention.associate = function (models) {
        PostMention.belongsTo(models.Post, { foreignKey: 'post_id', as: 'post' });
        PostMention.belongsTo(models.User, { foreignKey: 'mentioned_user_id', as: 'mentionedUser' });
    };

    return PostMention;
}; 