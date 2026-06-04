# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VidhyalayHub is a multi-tenant SaaS educational platform. Each tenant is a college/institution. The repo has two independent sub-projects:

| Sub-project | Directory | Stack |
|---|---|---|
| Backend API | `educational_platform_backend/` | Node.js + Express 5 + Sequelize + PostgreSQL |
| Frontend SPA | `educational_platform_frontend/` | React 18 + Vite + Tailwind + shadcn/ui |

---

## Backend Commands

Run from `educational_platform_backend/`:

```bash
npm start              # dev server with nodemon (port 3030)
npm run start:prod     # production (NODE_ENV=production node server.js)
npm run pm2:prod       # PM2 cluster mode
npm run docker:build   # build Docker image
npm run docker:run     # run Docker container with .env
npm run audit:backend  # run the backend audit script
npm run create-super-admin        # create a main_admin super admin
npm run create-super-admin-owner  # create a super_admin_owner
```

Health check: `GET /health` or `GET /api/health` — returns 200 when DB connected, 503 otherwise.

---

## Frontend Commands

Run from `educational_platform_frontend/`:

```bash
npm run dev          # Vite dev server (port 8080)
npm run build        # production bundle
npm run preview      # preview production build locally
npm run lint         # ESLint
npm run test         # Vitest unit tests (single run)
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright end-to-end tests
npm run test:e2e:ui  # Playwright with UI
```

Run a single Vitest test file:
```bash
npx vitest run src/path/to/file.test.jsx
```

---

## Environment Setup

**Backend** — copy `educational_platform_backend/.env.example` → `.env`:
- `POSTGRESQL_*` — database credentials (host defaults to `127.0.0.1`, port `5432`)
- `JWT_SECRET` — must be set; anything works locally
- `DEFAULT_TENANT_SLUG=rcpit` — fallback tenant when no header/subdomain present
- `STORAGE_PROVIDER=local` — uploads go to `uploads/`; set to `s3` with `AWS_*` vars for S3
- `ADMIN_PORTAL_OPEN=true` — bypass portal auth in local dev only

**Frontend** — copy `educational_platform_frontend/.env.example` → `.env`:
- `VITE_API_BASE_URL=http://localhost:3030/api`
- `VITE_DEFAULT_TENANT_SLUG=rcpit`

---

## Architecture

### Multi-Tenancy

Every API request goes through `tenantResolver` middleware (`middleware/tenant.js`), which resolves `req.tenant` from:
1. `X-Tenant-Slug` request header (frontend always sends this)
2. Host subdomain matching `*.PLATFORM_DOMAIN`
3. Fallback to `DEFAULT_TENANT_SLUG` env var

After JWT auth, `assertTenantAccess` enforces that college users can only access their own tenant. Platform/super-admin users bypass this check.

### Auth & Role Hierarchy

JWT auth is in `middleware/auth.js`. The resolved `req.user` has:
- `user_type`: `'student'` | `'teacher'` | `'alumni'` | `'staff'`
- `portal_access`: `'none'` | `'college'` | `'platform'`
- `super_admin_owner`: boolean (full bypass of all RBAC)
- `tenant_id`: institution UUID (null for platform-level users)

Portal access rules (`utils/portalAccess.js`):
- `user_type === 'staff'` + `tenant_id` → `'college'` (institution admin)
- `user_type === 'staff'` + no `tenant_id` → `'platform'`
- Email in `PLATFORM_ADMIN_EMAILS` env var → `'platform'`

Super admin has a separate login at `/super-admin-login` → `POST /api/super-admin-auth/login`.

### Backend Structure

- **`server.js`** — app bootstrap: loads env, applies security middleware, registers all routes, then calls `bootstrapDatabase()` which syncs Sequelize models and runs schema migrations before starting the HTTP server
- **`database/index.js`** — Sequelize instance + all model registrations and associations
- **`database/ensure*Schema.js`** — idempotent `ALTER TABLE` migration scripts that run on every startup; add new columns here instead of dropping/recreating tables
- **`middleware/`** — auth, tenant resolution, RBAC, file upload, rate limiting, security stack
- **`controllers/`** — request handlers; all wrapped with `asyncHandler` for automatic error propagation
- **`routes/`** — Express routers; typically `authenticate` → optional `hydrateRbac` → controller
- **`utils/`** — pure helpers (no DB access); `tenantScope.js`, `portalAccess.js`, `resolveMediaUrl.js`, etc.
- **`services/`** — heavier services: LLM calls, media upload/asset management, notification fan-out
- **`storage/StorageService.js`** — abstraction over local disk and S3; selected by `STORAGE_PROVIDER`

In production, set `SKIP_SEQUELIZE_SYNC=true` to skip `sequelize.sync()` and rely solely on the `ensureXSchema` bootstrap scripts.

### Frontend Structure

- **`src/App.jsx`** — root; wraps everything in `TenantProvider` → `AuthProvider` → `AppContent`. Navigation is entirely state-driven (`currentPage` string), not URL-based. All pages render inside `AppContent.renderCurrentPage()`.
- **`src/contexts/`** — `AuthContext` (JWT + user state), `TenantContext` (branding/slug), `ProfileNavigationContext` (cross-component navigate)
- **`src/services/api.js`** — Axios base client; attaches `Authorization: Bearer <token>` and `X-Tenant-Slug` header automatically on every request
- **`src/services/*.js`** — one file per domain (posts, messages, jobs, etc.); import from here, never call Axios directly in components
- **`src/lib/access.js`** — client-side role guards (`canSeeAdminNav`, `canSeeSuperAdminNav`, `getPortalAccess`) mirroring backend portal logic
- **`src/lib/feedTenant.js`** — `filterPostsForCollegeHome()` filters feed posts to the user's tenant on the client side
- **`src/components/`** — feature pages (each heavy page is `lazy()`-loaded) + shared UI components
- **`@`** path alias maps to `src/`

### Key Patterns

- **Schema evolution**: add a column in the relevant `database/ensureXSchema.js` (pattern: `ALTER TABLE IF NOT EXISTS … ADD COLUMN IF NOT EXISTS`). The file runs on every server start.
- **New API route**: create `routes/fooRoutes.js`, register in `server.js` under `/api/foo`, add controller in `controllers/fooController.js`. Use `authenticate` + `asyncHandler`.
- **New frontend page**: add a `case 'foo'` in `App.jsx → renderCurrentPage()`, add nav entry in `LeftSidebar`, create `src/components/Foo.jsx` (lazy import at top of App.jsx).
- **File uploads**: backend uses `multer` via `middleware/uploadMiddleware.js`; files stored via `StorageService`; URLs resolved by `utils/resolveMediaUrl.js`.
