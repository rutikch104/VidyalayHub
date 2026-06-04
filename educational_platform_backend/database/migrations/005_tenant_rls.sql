-- Phase 3: PostgreSQL RLS safety net (optional; enable with ENABLE_TENANT_RLS=true)

CREATE OR REPLACE FUNCTION app_tenant_row_visible(row_tenant uuid) RETURNS boolean AS $$
  SELECT
    coalesce(current_setting('app.rls_active', true), '') <> 'true'
    OR coalesce(current_setting('app.bypass_rls', true), '') = 'true'
    OR row_tenant IS NULL
    OR row_tenant::text = coalesce(nullif(current_setting('app.current_tenant_id', true), ''), '__none__')
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_connection_row_visible(
  row_tenant uuid,
  row_scope text,
  row_sender uuid,
  row_receiver uuid
) RETURNS boolean AS $$
  SELECT
    coalesce(current_setting('app.rls_active', true), '') <> 'true'
    OR coalesce(current_setting('app.bypass_rls', true), '') = 'true'
    OR app_tenant_row_visible(row_tenant)
    OR (
      row_scope = 'global'
      AND coalesce(nullif(current_setting('app.current_user_id', true), ''), '__none__') IN (row_sender::text, row_receiver::text)
    )
$$ LANGUAGE sql STABLE;

-- Helper to attach standard tenant policy
DO $rls$
DECLARE
  t text;
  tables text[] := ARRAY[
    'Posts', 'Comments', 'Communities', 'CommunityPosts', 'MessageThreads', 'Messages',
    'Notifications', 'Bookmarks', 'MediaAssets', 'Events', 'JobPosts', 'JobApplications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL USING (app_tenant_row_visible(tenant_id)) WITH CHECK (app_tenant_row_visible(tenant_id))',
      t
    );
  END LOOP;
END
$rls$;

ALTER TABLE "Connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Connections" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Connections";
CREATE POLICY tenant_isolation ON "Connections"
  FOR ALL
  USING (app_connection_row_visible(tenant_id, scope, sender_id, receiver_id))
  WITH CHECK (app_connection_row_visible(tenant_id, scope, sender_id, receiver_id));
