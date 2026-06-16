export const QUICK_SEARCH_SUGGESTIONS = [
  { label: 'Teachers', query: 'Teachers' },
  { label: 'Students', query: 'Students' },
  { label: 'Alumni', query: 'Alumni' },
  { label: 'Communities', query: 'Communities' },
  { label: 'Events', query: 'Events' },
  { label: 'Placement Opportunities', query: 'Placement Opportunities' },
  { label: 'ReactJS', query: 'ReactJS' },
  { label: 'AWS', query: 'AWS' },
  { label: 'Computer Engineering', query: 'Computer Engineering' },
  { label: 'Resume Building', query: 'Resume Building' },
  { label: 'Recruitment Drive', query: 'Recruitment Drive' },
  { label: 'Research Projects', query: 'Research Projects' },
  { label: '#ReactJS', query: '#ReactJS' },
  { label: 'Campus Placement Drive', query: 'Campus Placement Drive' },
];

export function filterSearchSuggestions(query, recentSearches = []) {
  const q = String(query || '').trim().toLowerCase();

  if (!q) {
    return {
      recent: recentSearches.slice(0, 5),
      suggested: [],
    };
  }

  const recent = recentSearches.filter((item) =>
    item.toLowerCase().includes(q),
  );

  const suggested = QUICK_SEARCH_SUGGESTIONS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.query.toLowerCase().includes(q),
  );

  const recentSet = new Set(recent.map((r) => r.toLowerCase()));
  const extraFromRecent = recent;
  const mergedSuggested = [
    ...suggested,
    ...extraFromRecent
      .filter((r) => !suggested.some((s) => s.query.toLowerCase() === r.toLowerCase()))
      .map((r) => ({ label: r, query: r })),
  ];

  return {
    recent: q.length >= 2 ? recent : recentSearches.filter((item) => item.toLowerCase().includes(q)),
    suggested: mergedSuggested.slice(0, 8),
  };
}

export function alternativeSearchTerms(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return QUICK_SEARCH_SUGGESTIONS.slice(0, 4);

  const matches = QUICK_SEARCH_SUGGESTIONS.filter(
    (item) =>
      !item.query.toLowerCase().includes(q) &&
      (item.label.toLowerCase().includes(q.slice(0, 2)) ||
        item.query.toLowerCase().startsWith(q.slice(0, 2))),
  );

  if (matches.length >= 3) return matches.slice(0, 4);
  return QUICK_SEARCH_SUGGESTIONS.filter((item) => !item.query.toLowerCase().includes(q)).slice(0, 4);
}
