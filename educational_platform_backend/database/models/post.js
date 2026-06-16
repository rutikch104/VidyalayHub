module.exports = (sequelize, DataTypes) => {
    const Post = sequelize.define('Post', {
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
                model: 'Users', // ✅ References Users table
                key: 'id',
            },
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Tenants',
                key: 'tenant_id',
            },
        },
        // course_id: {
        //     type: DataTypes.UUID,
        //     allowNull: true,
        //     references: {
        //         model: 'Courses', // ✅ References Courses table
        //         key: 'id',
        //     },
        // },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        hashtags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
            defaultValue: [],
        },
        media_urls: {
            type: DataTypes.ARRAY(DataTypes.JSONB),
            allowNull: true,
            defaultValue: [],
            // Each media object will have: { url: string, type: 'image'|'video'|'code', metadata?: object }
        },
        type: {
            type: DataTypes.ENUM('text', 'image', 'video', 'question', 'update', 'code'),
            allowNull: false,
            defaultValue: 'text',
        },
        code_language: {
            type: DataTypes.STRING,
            allowNull: true,
            // For code snippets, specify the programming language
        },
        code_file_name: {
            type: DataTypes.STRING(120),
            allowNull: true,
        },
        visibility: {
            type: DataTypes.ENUM('public', 'college', 'private'),
            allowNull: false,
            defaultValue: 'public',
        },
        likes_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        comments_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        views_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        reposts_count: {
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
        }
    });

    Post.associate = function (models) {
        Post.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
        Post.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });       // ✅ Post belongs to User
        // Post.belongsTo(models.Course, { foreignKey: 'course_id', as: 'course' }); // 🔵 Uncomment this if Course model is ready
        Post.hasMany(models.Comment, { foreignKey: 'post_id', as: 'comments' });    // ✅ Post has many Comments
        Post.hasMany(models.Like, { foreignKey: 'post_id', as: 'likes' });          // ✅ Post has many Likes
        Post.hasMany(models.PostRepost, { foreignKey: 'post_id', as: 'reposts' });
        Post.hasMany(models.PostMention, { foreignKey: 'post_id', as: 'mentions' });
    };

    return Post;
};
