module.exports = (sequelize, DataTypes) => {
    const GlobalAnswer = sequelize.define('GlobalAnswer', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        question_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'GlobalQuestions', // Name of the referenced table
                key: 'id',
            },
        },
        answered_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users', // Name of the referenced table
                key: 'id',
            },
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });

    GlobalAnswer.associate = function (models) {
        GlobalAnswer.belongsTo(models.GlobalQuestion, { foreignKey: 'question_id', as: 'question' });
        GlobalAnswer.belongsTo(models.User, { foreignKey: 'answered_by', as: 'answerer' });
        GlobalAnswer.hasMany(models.AnswerLike, { foreignKey: 'answer_id', as: 'likes' });
        GlobalAnswer.hasMany(models.AnswerComment, { foreignKey: 'answer_id', as: 'comments' });
        GlobalAnswer.hasMany(models.AnswerMention, { foreignKey: 'answer_id', as: 'mentions' });
        GlobalAnswer.hasMany(models.Attachment, { foreignKey: 'type_id', as: 'attachments', scope: { type: 'answer' } });
    };

    return GlobalAnswer;
};