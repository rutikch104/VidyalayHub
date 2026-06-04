module.exports = (sequelize, DataTypes) => {
    const Attachment = sequelize.define('Attachment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        type: {
            type: DataTypes.ENUM('question', 'answer'),
            allowNull: false,
        },
        type_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        file_url: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        file_type: {
            type: DataTypes.ENUM('image', 'pdf', 'doc', 'other'),
            allowNull: false,
        },
        storage_key: {
            type: DataTypes.STRING(512),
            allowNull: true,
        },
        file_size: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        original_name: {
            type: DataTypes.STRING(512),
            allowNull: true,
        },
        uploaded_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users', // Name of the referenced table
                key: 'id',
            },
        },
        uploaded_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });

    Attachment.associate = function (models) {
        Attachment.belongsTo(models.User, { foreignKey: 'uploaded_by', as: 'uploader' });
    };

    return Attachment;
};