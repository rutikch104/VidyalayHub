module.exports = (sequelize, DataTypes) => {
    const AnswerMention = sequelize.define('AnswerMention', {
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
        mentioned_user: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
    });

    AnswerMention.associate = function (models) {
        AnswerMention.belongsTo(models.GlobalAnswer, { foreignKey: 'answer_id', as: 'answer' });
        AnswerMention.belongsTo(models.User, { foreignKey: 'mentioned_user', as: 'mentionedUser' });
    };

    return AnswerMention;
};
