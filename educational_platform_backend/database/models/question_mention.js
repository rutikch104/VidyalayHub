module.exports = (sequelize, DataTypes) => {
    const QuestionMention = sequelize.define('QuestionMention', {
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
        mentioned_user: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users', // Name of the referenced table
                key: 'id',
            },
        },
    });

    QuestionMention.associate = function (models) {
        QuestionMention.belongsTo(models.GlobalQuestion, { foreignKey: 'question_id', as: 'question' });
        QuestionMention.belongsTo(models.User, { foreignKey: 'mentioned_user', as: 'mentionedUser' });
    };

    return QuestionMention;
};