module.exports = (sequelize, DataTypes) => {
    const CollegeAdmin = sequelize.define('CollegeAdmin', {
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      college_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Tenants',
          key: 'tenant_id',
        },
      },
      role_title: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      alt_email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isEmail: true },
      },
      contact_number: {
        type: DataTypes.STRING(15),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    });
  
    CollegeAdmin.associate = function (models) {
      CollegeAdmin.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      CollegeAdmin.belongsTo(models.Tenant, { foreignKey: 'college_id', as: 'college' });
    };
  
    return CollegeAdmin;
  };
  