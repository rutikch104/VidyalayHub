/**
 * Shared search helpers: normalize input and avoid LIKE metacharacter injection (% _ \\).
 */

const MAX_SEARCH_LEN = 200;

function normalizeSearchQuery(raw) {
  if (raw == null || raw === '') return '';
  return String(raw).trim().slice(0, MAX_SEARCH_LEN);
}

/** Remove LIKE wildcards so ILIKE '%…%' matches a literal substring only */
function stripLikeMetacharacters(s) {
  if (!s) return '';
  return String(s).replace(/\\/g, '').replace(/%/g, '').replace(/_/g, '').trim();
}

/**
 * @returns {string|null} pattern including % wrappers, or null if nothing searchable left
 */
function ilikeContainsPattern(raw) {
  const inner = stripLikeMetacharacters(normalizeSearchQuery(raw));
  if (!inner) return null;
  return `%${inner}%`;
}

module.exports = {
  MAX_SEARCH_LEN,
  normalizeSearchQuery,
  stripLikeMetacharacters,
  ilikeContainsPattern,
};
