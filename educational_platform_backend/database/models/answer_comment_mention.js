module.exports = (sequelize, DataTypes) => {
  const AnswerCommentMention = sequelize.define('AnswerCommentMention', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    comment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'AnswerComments', key: 'id' },
    },
    mentioned_user: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
    },
  });

  AnswerCommentMention.associate = function (models) {
    AnswerCommentMention.belongsTo(models.AnswerComment, {
      foreignKey: 'comment_id',
      as: 'comment',
    });
    AnswerCommentMention.belongsTo(models.User, {
      foreignKey: 'mentioned_user',
      as: 'mentionedUser',
    });
  };

  return AnswerCommentMention;
};
