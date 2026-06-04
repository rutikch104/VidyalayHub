module.exports = (sequelize, DataTypes) => {
    const AnswerComment = sequelize.define('AnswerComment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        answer_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'GlobalAnswers',
                key: 'id',
            },
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        parent_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'AnswerComments',
                key: 'id',
            },
        },
        text: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });

    AnswerComment.associate = function (models) {
        AnswerComment.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        AnswerComment.belongsTo(models.GlobalAnswer, { foreignKey: 'answer_id', as: 'answer' });
        AnswerComment.belongsTo(models.AnswerComment, { foreignKey: 'parent_id', as: 'parent' });
        AnswerComment.hasMany(models.AnswerComment, { foreignKey: 'parent_id', as: 'replies' });
        AnswerComment.hasMany(models.AnswerCommentMention, { foreignKey: 'comment_id', as: 'mentions' });
    };

    return AnswerComment;
};
