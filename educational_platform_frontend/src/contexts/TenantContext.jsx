import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { DEFAULT_TENANT_SLUG } from '@/config/env';
import tenantService from '@/services/tenantService';

const TenantContext = createContext(null);

function readStoredSlug() {
  try {
    return localStorage.getItem('tenantSlug') || '';
  } catch {
    return '';
  }
}

function writeStoredSlug(slug) {
  try {
    if (slug) localStorage.setItem('tenantSlug', slug);
    else localStorage.removeItem('tenantSlug');
  } catch {
    /* ignore */
  }
}

export function TenantProvider({ children }) {
  const [slug, setSlugState] = useState(() => readStoredSlug() || DEFAULT_TENANT_SLUG);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const setSlug = useCallback((next) => {
    const s = String(next || DEFAULT_TENANT_SLUG).trim().toLowerCase();
    setSlugState(s);
    writeStoredSlug(s);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await tenantService.getTenantBySlug(slug);
        if (!cancelled) setTenant(data);
      } catch {
        if (!cancelled) setTenant(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const value = useMemo(
    () => ({
      slug,
      tenant,
      loading,
      setSlug,
      tenantId: tenant?.tenant_id || null,
      tenantName: tenant?.name || null,
      tenantLogo: tenant?.logo_url || null,
    }),
    [slug, tenant, loading, setSlug],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
