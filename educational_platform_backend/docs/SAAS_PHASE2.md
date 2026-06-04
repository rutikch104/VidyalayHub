# SaaS Phase 2 — Implemented

## Database

`tenant_id` added (model + `ensureTenantSaasSchema` + migration `003`):

| Table | Backfill source |
|--------|-----------------|
| `Bookmarks` | bookmarker's `Users.tenant_id` |
| `CommunityPosts` | `Communities.tenant_id` |
| `Events` | creator `Users.tenant_id` (if any NULL rows) |
| `JobPosts` | poster `Users.tenant_id` (if any NULL rows) |

`Events` and `JobPosts` already had `tenant_id` in Sequelize models; Phase 2 adds enforcement and NULL backfill.

## Strict tenant mode

Set when all rows are backfilled and you want to hide legacy `tenant_id IS NULL` rows:

```env
TENANT_STRICT_MODE=true
```

`mergeTenantWhere()` then uses `allowLegacyNull: false` automatically.

## API enforcement

### Bookmarks
- Scoped lists/deletes with `mergeTenantWhere`
- `tenant_id` on create
- `assertBookmarkableItem()` blocks bookmarking cross-college posts/events/resources

### Community posts
- `tenant_id` on create (from community)
- Feed and CRUD scoped; cross-tenant deny on mutations

### Jobs
- List/detail/apply use `buildVisibilityWhere()` — `college_only` jobs stay in-tenant; `global` jobs are cross-college
- Poster routes (edit, delete, applications) use `mergeTenantWhere` + `denyIfCrossTenant`

### Events
- Existing visibility rules kept; connections for network use tenant scope
- Update/delete deny cross-tenant access

## Migrations

```bash
cd educational_platform_backend
npm run migrate
```

Adds `database/migrations/003_tenant_saas_phase2.sql`.

## Phase 3

See [SAAS_PHASE3.md](./SAAS_PHASE3.md).
