module.exports = (sequelize, DataTypes) => {
  const UserRegistrationDocument = sequelize.define(
    'UserRegistrationDocument',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      doc_type: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      storage_url: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      mime_type: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      uploaded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      review_status: {
        type: DataTypes.STRING(32),
        defaultValue: 'pending',
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'user_registration_documents',
      timestamps: false,
    },
  );

  UserRegistrationDocument.associate = function associate(models) {
    UserRegistrationDocument.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    UserRegistrationDocument.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
  };

  return UserRegistrationDocument;
};
