const dotenv = require('dotenv');
dotenv.config();
const env = process.env.NODE_ENV || 'development';

const poolFromEnv = () => ({
  max: parseInt(process.env.POSTGRESQL_POOL_MAX, 10) || 20,
  min: parseInt(process.env.POSTGRESQL_POOL_MIN, 10) || 2,
  acquire: parseInt(process.env.POSTGRESQL_POOL_ACQUIRE, 10) || 30000,
  idle: parseInt(process.env.POSTGRESQL_POOL_IDLE, 10) || 10000,
});

const config = {
  production: {
    database: process.env.POSTGRESQL_DB,
    username: process.env.POSTGRESQL_USER,
    password: process.env.POSTGRESQL_PASSWORD,
    host: process.env.POSTGRESQL_HOST,
    dialect: process.env.POSTGRESQL_DIALECT || 'postgres',
    operatorAliases: process.env.POSTGRESQL_OPERATOR_ALIASES,
    pool: poolFromEnv(),
  },
  development: {
    database: process.env.POSTGRESQL_DB,
    username: process.env.POSTGRESQL_USER,
    password: process.env.POSTGRESQL_PASSWORD,
    host: process.env.POSTGRESQL_HOST,
    dialect: process.env.POSTGRESQL_DIALECT,
    operatorAliases: process.env.POSTGRESQL_OPERATOR_ALIASES,

    pool: {
      max:  50,
      min: 30,
      acquire:  1800000,
      idle:  1800000,
    }

  },
  staging: {
    database: process.env.POSTGRESQL_DB_STAGING,
    username: process.env.POSTGRESQL_USER,
    password: process.env.POSTGRESQL_PASSWORD,
    host: process.env.POSTGRESQL_HOST,
    dialect: process.env.POSTGRESQL_DIALECT,
    operatorAliases: process.env.POSTGRESQL_OPERATOR_ALIASES,

    pool: {
      max: parseInt(process.env.POSTGRESQL_POOL_MAX, 10) || 30,
      min: parseInt(process.env.POSTGRESQL_POOL_MIN, 10) || 10,
      acquire: parseInt(process.env.POSTGRESQL_POOL_ACQUIRE, 10) || 10000,
      idle: parseInt(process.env.POSTGRESQL_POOL_IDLE, 10) || 10000,
    }

  },
  test: {
    database: process.env.POSTGRESQL_DB_TEST,
    username: process.env.POSTGRESQL_USER,
    password: process.env.POSTGRESQL_PASSWORD,
    host: process.env.POSTGRESQL_HOST,
    dialect: process.env.POSTGRESQL_DIALECT,
    operatorAliases: process.env.POSTGRESQL_OPERATOR_ALIASES,

    pool: {
      max: parseInt(process.env.POSTGRESQL_POOL_MAX, 10) || 30,
      min: parseInt(process.env.POSTGRESQL_POOL_MIN, 10) || 10,
      acquire: parseInt(process.env.POSTGRESQL_POOL_ACQUIRE, 10) || 10000,
      idle: parseInt(process.env.POSTGRESQL_POOL_IDLE, 10) || 10000,
    }
  }
};

module.exports = config[env] || config.development;
