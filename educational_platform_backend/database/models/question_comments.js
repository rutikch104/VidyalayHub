module.exports = (sequelize, DataTypes) => {
    const QuestionComment = sequelize.define('QuestionComment', {
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
                model: 'GlobalQuestions',
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
        text: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });

    QuestionComment.associate = function (models) {
        QuestionComment.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        QuestionComment.belongsTo(models.GlobalQuestion, { foreignKey: 'question_id', as: 'question' });
    };

    return QuestionComment;
};
