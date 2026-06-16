const STORAGE_PREFIX = 'vh:search-history';
const MAX_RECENT = 5;

function storageKey(userId) {
  return `${STORAGE_PREFIX}:${userId || 'guest'}`;
}

export function getRecentSearches(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function addRecentSearch(userId, term) {
  const query = String(term || '').trim();
  if (query.length < 2) return getRecentSearches(userId);

  const next = [
    query,
    ...getRecentSearches(userId).filter(
      (item) => item.toLowerCase() !== query.toLowerCase(),
    ),
  ].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }

  return next;
}

export function removeRecentSearch(userId, term) {
  const query = String(term || '').trim();
  const next = getRecentSearches(userId).filter(
    (item) => item.toLowerCase() !== query.toLowerCase(),
  );

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    /* ignore */
  }

  return next;
}

export function clearRecentSearches(userId) {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
  return [];
}

export const RECENT_SEARCH_LIMIT = MAX_RECENT;
