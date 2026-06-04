module.exports = (sequelize, DataTypes) => {
    const AnswerLike = sequelize.define('AnswerLike', {
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
                model: 'GlobalAnswers', // Name of the referenced table
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

    AnswerLike.associate = function (models) {
        AnswerLike.belongsTo(models.GlobalAnswer, { foreignKey: 'answer_id', as: 'answer' });
        AnswerLike.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return AnswerLike;
};