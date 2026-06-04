module.exports = (sequelize, DataTypes) => {
    const GlobalQuestion = sequelize.define('GlobalQuestion', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        asked_by: {
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
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
        },
        is_anonymous: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_resolved: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });

    GlobalQuestion.associate = function (models) {
        GlobalQuestion.belongsTo(models.User, { foreignKey: 'asked_by', as: 'asker' });
        GlobalQuestion.hasMany(models.GlobalAnswer, { foreignKey: 'question_id', as: 'answers' });
        GlobalQuestion.hasMany(models.QuestionMention, { foreignKey: 'question_id', as: 'mentions' });
        GlobalQuestion.hasMany(models.QuestionLike, { foreignKey: 'question_id', as: 'likes' });
        GlobalQuestion.hasMany(models.QuestionComment, { foreignKey: 'question_id', as: 'comments' });
        GlobalQuestion.hasMany(models.Attachment, { foreignKey: 'type_id', as: 'attachments', scope: { type: 'question' } });
    };

    return GlobalQuestion;
};