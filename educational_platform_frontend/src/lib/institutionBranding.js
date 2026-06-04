import { resolveMediaUrl } from '@/services/postService';
import { PLATFORM_BRAND } from '@/lib/platformBranding';

/**
 * Build institution branding from auth user or API branding payload.
 */
export function institutionBrandingFromUser(user) {
  if (!user) return null;

  const nested = user.institution;
  const name =
    (nested?.name || user.tenant_name || '').trim() ||
    (user.tenant_id ? '' : PLATFORM_BRAND.name);
  const logoRaw = nested?.logo_url ?? user.tenant_logo_url ?? null;
  const logo_url = logoRaw ? resolveMediaUrl(logoRaw) || logoRaw : null;

  if (!user.tenant_id && !name) {
    return {
      tenant_id: '',
      name: PLATFORM_BRAND.name,
      logo_url: null,
      isPlatformFallback: true,
    };
  }

  if (!name && !logo_url) return null;

  return {
    tenant_id: user.tenant_id ? String(user.tenant_id) : '',
    name: name || 'Your institution',
    logo_url,
    isPlatformFallback: false,
  };
}

/** Monogram from institution name (max 2 chars). */
export function institutionMonogram(name) {
  const words = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return 'IN';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
