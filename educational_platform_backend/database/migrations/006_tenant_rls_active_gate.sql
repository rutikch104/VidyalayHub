-- RLS policies only enforce when app.rls_active = true (set by API middleware)

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
