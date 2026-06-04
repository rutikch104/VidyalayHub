/**
 * Tokenize post text for @mentions and #hashtags.
 * Mentions: @word — not inside emails (preceded by alphanumeric or .)
 * Hashtags: #word — must follow start of string or whitespace
 */

/** Active @mention segment before cursor (no whitespace inside handle). */
export function getMentionContext(text, cursorPos) {
  const before = text.slice(0, cursorPos);
  const at = before.lastIndexOf('@');
  if (at === -1) return null;
  if (at > 0) {
    const prev = before[at - 1];
    if (prev !== ' ' && prev !== '\n' && prev !== '\t') return null;
  }
  const rawAfter = before.slice(at + 1);
  /** Space/newline ends the mention — closes autocomplete after pick or typing a space. */
  if (/\s/.test(rawAfter)) return null;
  const query = rawAfter.match(/^(\w*)/)?.[1] ?? '';
  return { start: at, query };
}

function isMentionStart(text, i) {
  if (i > 0) {
    const prev = text[i - 1];
    if (/[A-Za-z0-9.]/.test(prev)) return false;
  }
  return true;
}

function isHashtagStart(text, i) {
  if (i > 0) {
    const prev = text[i - 1];
    if (!/[\s\n\t]/.test(prev)) return false;
  }
  return i + 1 < text.length && /\w/.test(text[i + 1]);
}

export function parseSocialText(text) {
  if (text == null || text === '') return [{ type: 'text', value: '' }];
  const segments = [];
  let buf = '';
  let i = 0;
  const len = text.length;

  const flush = () => {
    if (buf) {
      segments.push({ type: 'text', value: buf });
      buf = '';
    }
  };

  while (i < len) {
    const ch = text[i];
    if (ch === '@' && isMentionStart(text, i)) {
      let j = i + 1;
      while (j < len && /[\w]/.test(text[j])) j += 1;
      if (j > i + 1) {
        flush();
        segments.push({ type: 'mention', value: text.slice(i, j) });
        i = j;
        continue;
      }
    }
    if (ch === '#' && isHashtagStart(text, i)) {
      let j = i + 1;
      while (j < len && /[\w]/.test(text[j])) j += 1;
      if (j > i + 1) {
        flush();
        segments.push({ type: 'hashtag', value: text.slice(i, j) });
        i = j;
        continue;
      }
    }
    buf += ch;
    i += 1;
  }
  flush();
  return segments;
}

/** Active #hashtag segment before cursor (no whitespace inside tag). */
export function getHashtagContext(text, cursorPos) {
  const before = text.slice(0, cursorPos);
  const hash = before.lastIndexOf('#');
  if (hash === -1) return null;
  if (hash > 0) {
    const prev = before[hash - 1];
    if (prev !== ' ' && prev !== '\n' && prev !== '\t') return null;
  }
  const rawAfter = before.slice(hash + 1);
  /** Space/newline ends the tag — closes autocomplete after pick or typing a space. */
  if (/\s/.test(rawAfter)) return null;
  const query = rawAfter.match(/^([\w]*)/)?.[1] ?? '';
  /** Allow bare "#" so popular-tag suggestions can appear (same as @). */
  return { start: hash, query };
}

/** True when # autocomplete should drive UI (at least one character after #). */
export function isHashtagAutocompleteActive(text, cursorPos) {
  return getHashtagContext(text, cursorPos) != null;
}

/** Body text with #hashtag segments removed (for display when tags show as badges). */
export function contentWithoutHashtags(text) {
  if (!text) return '';
  const parts = parseSocialText(text)
    .filter((seg) => seg.type !== 'hashtag')
    .map((seg) => seg.value);
  return parts
    .join('')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Unique display tags from stored array + any legacy inline #tokens. */
export function mergeDisplayHashtags(tags = [], content = '') {
  const seen = new Map();
  const add = (tag) => {
    const name = String(tag || '')
      .trim()
      .replace(/^#+/, '');
    if (!name) return;
    const key = name.toLowerCase();
    if (!seen.has(key)) seen.set(key, name);
  };
  (Array.isArray(tags) ? tags : []).forEach(add);
  extractHashtagNamesFromText(content || '').forEach(add);
  return [...seen.values()];
}

export function extractHashtagNamesFromText(text) {
  const names = [];
  const seen = new Set();
  for (const seg of parseSocialText(text || '')) {
    if (seg.type === 'hashtag') {
      const n = seg.value.slice(1);
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        names.push(n);
      }
    }
  }
  return names;
}

/**
 * Resolve which autocomplete is active when # and @ could both appear — pick the
 * segment that starts closest to the cursor.
 */
export function getActiveComposerAutocomplete(text, cursorPos) {
  const h = getHashtagContext(text, cursorPos);
  const m = getMentionContext(text, cursorPos);
  if (!h && !m) return { kind: 'none' };
  if (!h) return { kind: 'mention', ctx: m };
  if (!m) return { kind: 'hashtag', ctx: h };
  if (h.start >= m.start) return { kind: 'hashtag', ctx: h };
  return { kind: 'mention', ctx: m };
}
