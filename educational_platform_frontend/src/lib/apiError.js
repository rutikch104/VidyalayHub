/**
 * Normalize axios errors for UI layers (toasts, forms).
 */
export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const data = error.response?.data;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (error.message === 'Network Error') return 'Network error. Check your connection and try again.';
  if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  return fallback;
}

export function isRetryableError(error) {
  if (!error) return false;
  if (error.code === 'ECONNABORTED' || error.message === 'Network Error') return true;
  const status = error.response?.status;
  return status === 502 || status === 503 || status === 504;
}
