module.exports = (sequelize, DataTypes) => {
    const QuestionLike = sequelize.define('QuestionLike', {
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
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users', // Name of the referenced table
                key: 'id',
            },
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });

    QuestionLike.associate = function (models) {
        QuestionLike.belongsTo(models.GlobalQuestion, { foreignKey: 'question_id', as: 'question' });
        QuestionLike.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return QuestionLike;
};