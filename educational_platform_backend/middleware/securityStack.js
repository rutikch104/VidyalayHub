const compression = require('compression');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { isProduction, rateLimit: rateLimitCfg } = require('../config/env');
const { securityHeaders } = require('./productionHttp');

function applySecurityMiddleware(app) {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      // Allow <img>/<video> from the Vite app (different port) to load /media and /uploads
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(securityHeaders);

  app.use(
    compression({
      threshold: 1024,
      level: isProduction ? 6 : 1,
    })
  );

  const limiter = rateLimit({
    windowMs: rateLimitCfg.windowMs,
    max: rateLimitCfg.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: 'Too many requests. Please try again later.' },
    skip: (req) => req.path === '/health' || req.path === '/api/health',
  });

  app.use('/api', limiter);
}

module.exports = { applySecurityMiddleware };
