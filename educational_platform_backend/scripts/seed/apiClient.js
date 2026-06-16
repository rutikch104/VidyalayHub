/**
 * Lightweight HTTP client for seed scripts (mirrors frontend api.js headers).
 *
 * Includes 429 (rate-limit) handling: when the backend returns 429 we wait for
 * the time hinted by `Retry-After` or the express-rate-limit headers, then
 * retry. Useful when seeding lots of users against a windowed rate limit.
 */
const BASE = process.env.SEED_BASE_URL || `http://127.0.0.1:${process.env.NODE_PORT || 3030}/api`;

const RATE_LIMIT_MAX_WAIT_SEC = parseInt(process.env.SEED_RATE_LIMIT_MAX_WAIT_SEC || '900', 10);
const RATE_LIMIT_MAX_RETRIES = parseInt(process.env.SEED_RATE_LIMIT_MAX_RETRIES || '3', 10);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseRetryDelay(res) {
  // Standard Retry-After (seconds) — express-rate-limit sets this on 429.
  const retryAfter = res.headers.get('retry-after');
  if (retryAfter) {
    const n = Number(retryAfter);
    if (Number.isFinite(n) && n > 0) return Math.min(n, RATE_LIMIT_MAX_WAIT_SEC) * 1000;
  }
  // express-rate-limit "standardHeaders" mode also sets RateLimit-Reset (seconds from now).
  const reset = res.headers.get('ratelimit-reset');
  if (reset) {
    const n = Number(reset);
    if (Number.isFinite(n) && n > 0) return Math.min(n, RATE_LIMIT_MAX_WAIT_SEC) * 1000;
  }
  // Fallback: 30s.
  return 30_000;
}

async function rawRequest(method, path, { token, tenantSlug, body, formData } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;

  const opts = { method, headers };
  if (formData) {
    opts.body = formData;
  } else if (body != null) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return fetch(`${BASE}${path}`, opts);
}

async function request(method, path, { token, tenantSlug, body, formData, expectStatus } = {}) {
  let attempt = 0;
  let res;
  while (true) {
    res = await rawRequest(method, path, { token, tenantSlug, body, formData });
    if (res.status !== 429 || attempt >= RATE_LIMIT_MAX_RETRIES) break;
    const delayMs = parseRetryDelay(res);
    const secs = Math.ceil(delayMs / 1000);
    console.warn(`[apiClient] 429 on ${method} ${path}; waiting ${secs}s before retry (attempt ${attempt + 1}/${RATE_LIMIT_MAX_RETRIES})…`);
    await sleep(delayMs + 250); // tiny pad
    attempt += 1;
  }

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 300) };
  }

  if (expectStatus != null && res.status !== expectStatus) {
    const msg = json?.message || json?.raw || res.statusText;
    throw new Error(`${method} ${path} → ${res.status} (expected ${expectStatus}): ${msg}`);
  }

  return { status: res.status, json, ok: res.ok };
}

async function signIn(email, password, tenantSlug) {
  const { json } = await request('POST', '/auth/signin', {
    tenantSlug,
    body: { email, password },
    expectStatus: 200,
  });
  const token = json?.data?.token || json?.token;
  const user = json?.data?.user || json?.user;
  if (!token) throw new Error(`Sign-in failed for ${email}: ${json?.message || 'no token'}`);
  return { token, user };
}

async function registerUser(payload, tenantSlug) {
  const { status, json } = await request('POST', '/auth/register', {
    tenantSlug,
    body: { ...payload, tenant_id: payload.tenant_id },
  });
  if (status === 409) return { skipped: true, reason: 'exists', email: payload.email };
  if (status !== 201 && status !== 200) {
    throw new Error(`Register ${payload.email} failed (${status}): ${json?.message || JSON.stringify(json)}`);
  }
  const user = json?.data?.user || json?.user;
  return { skipped: false, user, pendingApproval: json?.data?.pending_approval === true };
}

async function uploadAvatarFromUrl(token, tenantSlug, imageUrl) {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const form = new FormData();
    form.append('avatar', new Blob([buf], { type: 'image/jpeg' }), 'avatar.jpg');
    const { json } = await request('POST', '/users/profile/avatar', { token, tenantSlug, formData: form });
    return json?.data?.avatar_url || json?.data?.url || null;
  } catch {
    return null;
  }
}

module.exports = {
  BASE,
  request,
  signIn,
  registerUser,
  uploadAvatarFromUrl,
};
