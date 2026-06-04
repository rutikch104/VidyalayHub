module.exports = (sequelize, DataTypes) => {
  const CommunityMember = sequelize.define(
    'CommunityMember',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      community_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Communities', key: 'id' },
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      role: {
        type: DataTypes.ENUM('member', 'moderator', 'admin'),
        allowNull: false,
        defaultValue: 'member',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      joined_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'CommunityMembers',
      underscored: true,
      timestamps: false,
      indexes: [{ unique: true, fields: ['community_id', 'user_id'] }],
    }
  );

  CommunityMember.associate = (models) => {
    CommunityMember.belongsTo(models.Community, { foreignKey: 'community_id', as: 'community' });
    CommunityMember.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return CommunityMember;
};
