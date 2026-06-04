/**
 * Frontend environment accessors (Vite exposes only VITE_* vars).
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3030/api';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
export const IS_PROD = import.meta.env.PROD;
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'VidhyalayHub';
/** Default institution slug (RC Patel launch: rcpit) */
export const DEFAULT_TENANT_SLUG =
  import.meta.env.VITE_DEFAULT_TENANT_SLUG || 'rcpit';

if (IS_PROD && USE_MOCK) {
  console.warn('[VidhyalayHub] VITE_USE_MOCK is enabled in production build — disable for real deployments.');
}

if (IS_PROD && API_BASE_URL.includes('localhost')) {
  console.warn('[VidhyalayHub] VITE_API_BASE_URL still points to localhost in production.');
}
