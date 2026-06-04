# SaaS Phase 1 — Implemented

## Database

`tenant_id` added (model + `ensureTenantSaasSchema` on boot + SQL migrations):

| Table | Backfill source |
|--------|-----------------|
| `Comments` | `Posts.tenant_id` |
| `Connections` | sender `Users.tenant_id` |
| `Communities` | creator `Users.tenant_id` |
| `MessageThreads` | creator `Users.tenant_id` |
| `Messages` | `MessageThreads.tenant_id` |
| `Notifications` | recipient `Users.tenant_id` |

## API enforcement

- **`mergeTenantWhere()`** — list queries scoped to the user’s college (legacy `NULL` rows still visible during migration).
- **`denyIfCrossTenant()`** — block access when `tenant_id` does not match JWT/header context.
- **`assertCollegePeerUsers()`** — connections and direct messages only within the same institution (platform admins exempt).

### Controllers updated

- Connections (create, lists, accept)
- Communities (list, featured, create)
- Messages (threads, send, list)
- Notifications (list + `NotificationService.persistNotification`)
- Posts / comments (create, list)

## Migrations (production)

```bash
cd educational_platform_backend
npm run migrate
```

Files:

- `database/migrations/001_tenant_saas_phase0.sql`
- `database/migrations/002_tenant_saas_phase1.sql`

Tracked in `_schema_migrations`. Dev still runs `ensureTenantSaasSchema` on server start for convenience.

## Recommended production env

```env
# After migrations verified:
# SKIP_SEQUELIZE_SYNC=true   # optional future flag — use migrate + controlled deploys
DEFAULT_TENANT_SLUG=rcpit
```

## Phase 2

See [SAAS_PHASE2.md](./SAAS_PHASE2.md).
