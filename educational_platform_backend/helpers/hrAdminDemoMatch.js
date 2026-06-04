/**
 * Demo Q&A matcher — source of truth: data/hrAdminDemoQA.json
 * Supports:
 *   - Flat array: [ { "question", "answer", "aliases"? }, ... ]
 *   - Categorized object: { "category_key": [ { "question", "answer" }, ... ], ... }
 * Env: HR_ADMIN_DEMO_QA_FILE, HR_ADMIN_DEMO_QA_RELOAD, HR_ADMIN_DEMO_MATCH_THRESHOLD
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_FILE = path.join(__dirname, '../data/hrAdminDemoQA.json');

let cache = { key: null, entries: null };

/** Common STT typo: "lives" → "leaves" when the rest sounds like leave policy. */
function applyVoiceTypoFixes(text) {
  let s = String(text || '');
  const lower = s.toLowerCase();
  if (/\blives\b/i.test(s) && /\b(year|annual|per|vacation|policy|off|many|how|leave|hr|day)\b/i.test(lower)) {
    s = s.replace(/\blives\b/gi, 'leaves');
  }
  return s;
}

function normalizeText(s) {
  if (!s || typeof s !== 'string') return '';
  const fixed = applyVoiceTypoFixes(s);
  return fixed
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(norm) {
  if (!norm) return [];
  const m = norm.match(/\p{L}[\p{L}\p{M}]*|\p{N}+/gu);
  return m || [];
}

function jaccard(aSet, bSet) {
  if (!aSet.size || !bSet.size) return 0;
  let inter = 0;
  for (const x of aSet) {
    if (bSet.has(x)) inter += 1;
  }
  const union = aSet.size + bSet.size - inter;
  return union ? inter / union : 0;
}

function overlapCoef(userTokens, targetTokens) {
  if (!userTokens.length || !targetTokens.length) return 0;
  const u = new Set(userTokens);
  const t = new Set(targetTokens);
  let inter = 0;
  for (const x of u) {
    if (t.has(x)) inter += 1;
  }
  return inter / Math.min(u.size, t.size);
}

function bigrams(norm) {
  const s = norm.replace(/\s/g, '');
  if (s.length < 2) return new Set();
  const out = new Set();
  for (let i = 0; i < s.length - 1; i += 1) {
    out.add(s.slice(i, i + 2));
  }
  return out;
}

function bigramJaccard(normA, normB) {
  return jaccard(bigrams(normA), bigrams(normB));
}

function validateEntry(row) {
  if (!row || typeof row !== 'object') return null;
  const q = row.question;
  const a = row.answer;
  if (typeof q !== 'string' || typeof a !== 'string') return null;
  const aliases = Array.isArray(row.aliases)
    ? row.aliases.filter((x) => typeof x === 'string' && x.trim())
    : [];
  return { question: q.trim(), answer: a.trim(), aliases };
}

function flattenParsed(parsed) {
  if (Array.isArray(parsed)) {
    return parsed.map(validateEntry).filter(Boolean);
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const out = [];
    for (const rows of Object.values(parsed)) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const v = validateEntry(row);
        if (v) out.push(v);
      }
    }
    return out;
  }
  return [];
}

function loadDemoEntries() {
  const filePath = process.env.HR_ADMIN_DEMO_QA_FILE || DEFAULT_FILE;
  const reload =
    process.env.HR_ADMIN_DEMO_QA_RELOAD === '1' ||
    process.env.HR_ADMIN_DEMO_QA_RELOAD === 'true';

  try {
    if (!fs.existsSync(filePath)) {
      cache = { key: filePath, entries: [] };
      return [];
    }
    const stat = fs.statSync(filePath);
    const cacheKey = `${filePath}:${stat.mtimeMs}`;
    if (!reload && cache.entries !== null && cache.key === cacheKey) {
      return cache.entries;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const entries = flattenParsed(parsed);
    cache = { key: cacheKey, entries };
    return entries;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('hrAdminDemoMatch: failed to load QA file', e.message || e);
    cache = { key: null, entries: [] };
    return [];
  }
}

/**
 * @param {string} userText
 * @param {Array<{question:string,answer:string,aliases:string[]}>} [entries]
 */
function findBestDemoAnswer(userText, entries) {
  const list = entries || loadDemoEntries();
  const userNorm = normalizeText(userText);
  if (!userNorm) return null;
  const userTokens = tokenize(userNorm);
  const userTokSet = new Set(userTokens);

  let best = null;

  for (const entry of list) {
    const texts = [entry.question, ...entry.aliases];
    for (const t of texts) {
      const tn = normalizeText(t);
      if (!tn) continue;
      const tokTarget = tokenize(tn);
      const targetSet = new Set(tokTarget);

      let score = jaccard(userTokSet, targetSet);
      score = Math.max(score, overlapCoef(userTokens, tokTarget));

      if (userNorm.length >= 3 && tn.length >= 3) {
        if (tn.includes(userNorm) || userNorm.includes(tn)) {
          score = Math.max(score, 0.88);
        }
      }

      score = Math.max(score, bigramJaccard(userNorm, tn) * 0.95);

      if (score > (best?.score ?? 0)) {
        best = {
          answer: entry.answer,
          matchedQuestion: entry.question,
          score,
        };
      }
    }
  }

  const threshold = Number(process.env.HR_ADMIN_DEMO_MATCH_THRESHOLD || '0.28');
  if (!best || best.score < threshold) return null;
  return best;
}

module.exports = {
  loadDemoEntries,
  findBestDemoAnswer,
  normalizeText,
};
