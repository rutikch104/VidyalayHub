module.exports = (sequelize, DataTypes) => {
    const Like = sequelize.define('Like', {
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
    });

    Like.associate = function (models) {
        Like.belongsTo(models.Post, { foreignKey: 'post_id', as: 'post' }); // ✅ Like belongs to Post
        Like.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });  // ✅ Like belongs to User
    };

    return Like;
};
