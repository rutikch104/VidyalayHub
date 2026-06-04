// models/mainAdmin.js
module.exports = (sequelize, DataTypes) => {
    const MainAdmin = sequelize.define("MainAdmin", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM('super_admin', 'admin'),
        defaultValue: 'admin'
      },
      status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    }, {
      tableName: 'main_admins',
      timestamps: true
    });
  
    return MainAdmin;
  };
  