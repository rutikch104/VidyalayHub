/** Normalize hashtag for storage/dedup (no leading #, trimmed). */
function normalizeTagName(tag) {
  return String(tag || '')
    .trim()
    .replace(/^#+/, '');
}

/** Extract #word tokens from plain text. */
function extractHashtagsFromContent(text) {
  const names = [];
  const seen = new Set();
  const str = String(text || '');
  const re = /#(\w+)/g;
  let m = re.exec(str);
  while (m) {
    const n = normalizeTagName(m[1]);
    if (n) {
      const key = n.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        names.push(n);
      }
    }
    m = re.exec(str);
  }
  return names;
}

/** Merge tags from request body + inline #tokens; dedupe case-insensitively. */
function mergeUniqueTags(tagsRaw, content) {
  const map = new Map();
  const add = (tag) => {
    const n = normalizeTagName(tag);
    if (!n) return;
    const key = n.toLowerCase();
    if (!map.has(key)) map.set(key, n);
  };

  if (Array.isArray(tagsRaw)) {
    tagsRaw.forEach(add);
  } else if (tagsRaw) {
    try {
      const parsed = JSON.parse(tagsRaw);
      if (Array.isArray(parsed)) parsed.forEach(add);
      else add(tagsRaw);
    } catch {
      String(tagsRaw)
        .split(',')
        .forEach(add);
    }
  }

  extractHashtagsFromContent(content).forEach(add);
  return [...map.values()];
}

/** Remove #hashtag tokens from body text (keeps @mentions). */
function stripHashtagsFromContent(content) {
  let out = String(content || '');
  out = out.replace(/#(\w+)/g, '');
  out = out.replace(/[ \t]{2,}/g, ' ');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

module.exports = {
  normalizeTagName,
  extractHashtagsFromContent,
  mergeUniqueTags,
  stripHashtagsFromContent,
};
