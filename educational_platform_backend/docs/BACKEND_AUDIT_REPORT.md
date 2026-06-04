# Backend Production Readiness Audit

**Date:** 2026-05-22  
**Scope:** ~280 API routes, auth/RBAC, multi-tenant SaaS (Phases 0–3), media, notifications, jobs, events.

## How to re-run

```bash
cd educational_platform_backend
npm run audit:backend
# Optional live sign-in:
# AUDIT_EMAIL=you@college.edu AUDIT_PASSWORD=*** npm run audit:backend
```

Server must be running on `NODE_PORT` (default 3030).

---

## Executive summary

| Area | Status | Notes |
|------|--------|--------|
| Health & DB | ✅ | `/health`, PostgreSQL connected |
| Auth on protected routes | ✅ | Sample routes return 401 without JWT |
| Invalid JWT | ✅ | Rejected with 401 |
| Multi-tenant schema | ✅ | `tenant_id` on core tables; `Connections.scope` |
| Smoke APIs (authenticated) | ✅ | After jobs visibility fix |
| Security hardening | ⚠️ | See findings below |
| Refresh tokens | ❌ | Not implemented (JWT expiry only) |
| Automated E2E suite | ⚠️ | `npm run audit:backend` covers smoke; not full 280 routes |

---

## Fixes applied during audit

1. **`GET /api/jobs` 500** — `buildVisibilityWhere` defaulted to `created_by`; `JobPosts` uses `posted_by`. Defaults changed; jobs pass `{ postedByField: 'posted_by' }` only.
2. **`POST /api/notifications/create`** — Any user could notify arbitrary `user_id`. Restricted to self (platform admins exempt); uses `NotificationService.persistNotification` with `tenant_id`.
3. **Notification tenant scope** — `unread-count` and bulk ops use `mergeTenantWhere`.
4. **`npm run audit:backend`** — Repeatable audit script added.

---

## Security findings

### High (addressed)

| Issue | Mitigation |
|--------|------------|
| Open notification creation for any user | Controller restricted to `req.user.id` unless platform user |

### Medium (action before production)

| Issue | Recommendation |
|--------|----------------|
| No refresh-token flow | Document session length (`JWT_EXPIRES_IN`); add refresh later or shorter access tokens |
| `DEFAULT_TENANT_SLUG=rcpit` may be **pending** in DB | Use an **approved** tenant slug in env; public `/api/tenants/public/by-slug/:slug` only returns approved |
| `ADMIN_PORTAL_OPEN=true` in dev | Never set in production |
| `ENABLE_TENANT_RLS` optional | Enable after smoke test with `app.rls_active` gate (migration 006) |
| Public `POST /api/tenants/createtenants` | Rate-limit + review for spam (already behind `/api` limiter) |
| Stateless JWT logout | Logout is client-side; no server-side revocation list |

### Low

| Issue | Notes |
|--------|--------|
| Tenant header mismatch with invalid slug | Resolver may leave `req.tenant` null; JWT tenant still applied — consider stricter 403 when slug unknown |
| Global Q&A / resources | Intentionally cross-tenant modules; bookmarks/posts enforce college scope |

---

## Architecture & code quality

**Strengths**

- Clear route modules per domain (~27 routers).
- `tenantResolver` + `assertTenantAccess` on all authenticated app traffic.
- `mergeTenantWhere` / `denyIfCrossTenant` / `buildVisibilityWhere` for SaaS.
- Helmet, compression, rate limiting on `/api`.
- SQL migrations tracked in `_schema_migrations`.
- `SKIP_SEQUELIZE_SYNC` for production boot.

**Improvements (backlog)**

- Split god controllers (`postController`, `userApiController`) into services.
- Add integration tests per module (supertest + test DB).
- Standardize response shape `{ status, message, data }` everywhere (mostly consistent).
- Remove duplicate legacy `/api/users` admin CRUD vs app routes (document deprecation).

---

## Production deployment checklist

```env
NODE_ENV=production
ACCESS_TOKEN_SECRET=<strong-secret>
ALLOWED_ORIGINS=https://your-frontend.vercel.app
DEFAULT_TENANT_SLUG=r-c-patel-institute-of-technology   # approved slug
SKIP_SEQUELIZE_SYNC=true
TENANT_STRICT_MODE=true
# ENABLE_TENANT_RLS=true   # after validation
ADMIN_PORTAL_OPEN=false
PLATFORM_ADMIN_EMAILS=owner@yourdomain.com
TRUST_PROXY=1
```

```bash
npm run migrate
npm run start:prod
npm run audit:backend
```

---

## API surface (reference)

~280 endpoints across: users, auth, posts, feed, comments, likes, jobs, events, bookmarks, messages, notifications, connections, communities, global-questions, resource-library, admin, super-admin, RBAC, AI stubs, tenants, branding.

Full route map: see agent exploration or grep `router.` in `routes/`.

---

## Real-time / WebSockets

Not present — messaging is REST polling (`unread-count`). No Socket.io in dependencies.

---

## Media & storage

- Local (`STORAGE_PROVIDER=local`) or S3 via `@aws-sdk/client-s3`.
- Upload validation: MIME, extension allowlist, size caps per category (`storage/utils/fileValidation.js`).
- Tenant-prefixed keys: `tenants/{tenantId}/...` (Phase 0).

---

## Next steps

1. Set `DEFAULT_TENANT_SLUG` to an **approved** tenant in production.
2. Run `npm run audit:backend` on staging after each release.
3. Add supertest integration tests for auth, posts, jobs, tenant isolation.
4. Consider refresh tokens or shorter JWT TTL for production.
