module.exports = (sequelize, DataTypes) => {
    const Comment = sequelize.define('Comment', {
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
                model: 'Posts', // ✅ References Posts table
                key: 'id',
            },
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users', // ✅ References Users table
                key: 'id',
            },
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Tenants', key: 'tenant_id' },
        },
        parent_comment_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Comments',
                key: 'id',
            },
        },
        text: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        likes_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
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

    Comment.associate = function (models) {
        Comment.belongsTo(models.Post, { foreignKey: 'post_id', as: 'post' }); // ✅ Comment belongs to Post
        Comment.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });  // ✅ Comment belongs to User
        Comment.belongsTo(models.Comment, { foreignKey: 'parent_comment_id', as: 'parent' });
        Comment.hasMany(models.Comment, { foreignKey: 'parent_comment_id', as: 'replies' });
        Comment.hasMany(models.CommentLike, { foreignKey: 'comment_id', as: 'likes' });
    };

    return Comment;
};
