# SaaS Phase 0 — Implemented

## Database
- `Tenants.slug` (unique) with auto-backfill (`rcpit` for RC Patel names)
- `Posts.tenant_id` denormalized + backfill from `Users`
- `MediaAssets.tenant_id` + backfill
- Indexes: `posts_tenant_created_idx`, `media_assets_tenant_idx`
- Bootstrap: `database/ensureTenantSaasSchema.js` (runs on server start)

## API middleware
- `tenantResolver` on `/api` — `X-Tenant-Slug`, subdomain, or `DEFAULT_TENANT_SLUG`
- `assertTenantAccess` chained after `authenticate` — blocks cross-tenant JWT misuse
- Public: `GET /api/tenants/public/by-slug/:slug`

## Posts
- Create sets `tenant_id` from user
- Feed/profile queries scoped with `tenantPostScope()`
- Single post GET checks `post.tenant_id`

## Media
- Storage keys: `tenants/{tenantId}/posts/...` when tenant known
- S3 provider: real `PutObject` / `DeleteObject` when `STORAGE_PROVIDER=s3`

## Auth
- JWT includes `tenant_slug`
- Production requires `ACCESS_TOKEN_SECRET` (or legacy `ACCESS_TOKEN_DSECRET`)
- Removed hardcoded JWT fallback secret

## Frontend
- `TenantProvider` + `VITE_DEFAULT_TENANT_SLUG=rcpit`
- Axios sends `X-Tenant-Slug` on every request

## Env (backend)
```
DEFAULT_TENANT_SLUG=rcpit
PLATFORM_DOMAIN=vidyalayhub.com
ACCESS_TOKEN_SECRET=...
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=...
```

## Next phase
- `tenant_id` on Comments, Connections, Communities, Messages, Notifications
- Sequelize migrations (replace `sync()` in production)
- PostgreSQL RLS optional safety net
