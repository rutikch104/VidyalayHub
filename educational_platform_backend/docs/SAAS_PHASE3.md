# SaaS Phase 3 — Implemented

## 1. Global teacher network

Connections support `scope`:

| Value | Meaning |
|--------|---------|
| `college` | Default — same institution only |
| `global` | Faculty (`teacher` / `staff`) may connect across colleges |

### API

**Send connection** — optional body field:

```json
{ "receiver_id": "...", "message": "...", "scope": "global" }
```

**Direct messages** — optional `scope: "global"` on thread create, or auto-allowed when an **accepted** `global` connection exists.

Helpers: `assertPeerConnection`, `assertDirectMessagePeers`, `mergeConnectionWhere` (lists include global links for faculty).

## 2. Job applications

`JobApplications.tenant_id` added (from `JobPosts.tenant_id` on apply).

## 3. PostgreSQL RLS (optional safety net)

Migration `005_tenant_rls.sql` enables RLS on tenant-scoped tables with session variables:

- `app.current_tenant_id`
- `app.current_user_id`
- `app.bypass_rls` (platform admins)

**Off by default** (`ENABLE_TENANT_RLS` unset). Policies are installed but pass through until middleware sets `app.rls_active=true` on each request.

Enable only after smoke tests:

```env
ENABLE_TENANT_RLS=true
```

Middleware sets `app.current_tenant_id`, `app.current_user_id`, and `app.bypass_rls` (`middleware/tenantRls.js`).

## 4. Production bootstrap

```env
SKIP_SEQUELIZE_SYNC=true
```

Runs `ensure*Schema` + `npm run migrate` instead of `sequelize.sync()` at startup.

## Migrations

```bash
cd educational_platform_backend
npm run migrate
```

- `004_tenant_saas_phase3.sql` — `Connections.scope`, `JobApplications.tenant_id`
- `005_tenant_rls.sql` — RLS policies (idempotent drop/create)

## Recommended production env

```env
DEFAULT_TENANT_SLUG=rcpit
SKIP_SEQUELIZE_SYNC=true
TENANT_STRICT_MODE=true
# ENABLE_TENANT_RLS=true   # after RLS smoke test
```

## Frontend follow-up (optional)

- Connection UI: “Connect within college” vs “Faculty network (global)” for teachers
- Pass `scope` on connection + DM APIs
