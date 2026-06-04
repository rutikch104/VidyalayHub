// @ts-nocheck
import api from './api';
import { resolveMediaUrl } from './postService';

function normalizeBranding(branding) {
  if (!branding) return null;
  const logoRaw = branding.logo_url;
  const logo_url = logoRaw ? resolveMediaUrl(logoRaw) || logoRaw : null;
  return {
    ...branding,
    logo_url,
    name: (branding.name || '').trim(),
  };
}

class BrandingService {
  async fetchInstitutionBranding() {
    const res = await api.get('/branding/institution');
    const branding = res.data?.data?.branding;
    return normalizeBranding(branding);
  }
}

export default new BrandingService();
