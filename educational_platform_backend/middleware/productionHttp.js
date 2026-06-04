/**
 * HTTP / CORS defaults for production deployments.
 * Set NODE_ENV=production and optionally ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
 */

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/** @returns {boolean | string | ((origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void)} */
function corsOriginOption() {
  if (!isProduction()) {
    return true;
  }
  const raw = process.env.ALLOWED_ORIGINS || '';
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) {
    return true;
  }
  return (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    cb(null, list.includes(origin));
  };
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const mediaPath =
    req.path.startsWith('/media/') ||
    req.path.startsWith('/uploads/') ||
    /^\/api\/resource-library\/[^/]+\/preview/.test(req.path);
  res.setHeader('X-Frame-Options', mediaPath ? 'SAMEORIGIN' : 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

module.exports = {
  isProduction,
  corsOriginOption,
  securityHeaders,
};
