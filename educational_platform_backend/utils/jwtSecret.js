const { isProduction } = require('../middleware/productionHttp');

function getJwtSecret() {
  const secret =
    process.env.ACCESS_TOKEN_SECRET ||
    process.env.ACCESS_TOKEN_DSECRET ||
    process.env.JWT_SECRET;

  if (secret) return secret;

  if (isProduction()) {
    throw new Error(
      'ACCESS_TOKEN_SECRET (or ACCESS_TOKEN_DSECRET) must be set in production.',
    );
  }

  console.warn('[auth] Using dev-only JWT secret — set ACCESS_TOKEN_SECRET for production.');
  return 'dev-only-change-me';
}

module.exports = { getJwtSecret };
