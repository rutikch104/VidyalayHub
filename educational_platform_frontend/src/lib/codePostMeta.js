export const CODE_SEPARATOR = '\n\n---\n\n';

const CODE_SEPARATORS = [
  '\n\n---\n\n',
  '\r\n\r\n---\r\n\r\n',
  '\n---\n',
  '\r\n---\r\n',
];

export const LANG_META = {
  javascript: { label: 'JavaScript', ext: 'js', slug: 'script' },
  typescript: { label: 'TypeScript', ext: 'ts', slug: 'snippet' },
  python: { label: 'Python', ext: 'py', slug: 'script' },
  java: { label: 'Java', ext: 'java', slug: 'Main' },
  cpp: { label: 'C++', ext: 'cpp', slug: 'snippet' },
  csharp: { label: 'C#', ext: 'cs', slug: 'Program' },
  go: { label: 'Go', ext: 'go', slug: 'main' },
  rust: { label: 'Rust', ext: 'rs', slug: 'main' },
  php: { label: 'PHP', ext: 'php', slug: 'index' },
  ruby: { label: 'Ruby', ext: 'rb', slug: 'script' },
  swift: { label: 'Swift', ext: 'swift', slug: 'main' },
  kotlin: { label: 'Kotlin', ext: 'kt', slug: 'Main' },
  html: { label: 'HTML', ext: 'html', slug: 'index' },
  css: { label: 'CSS', ext: 'css', slug: 'styles' },
  sql: { label: 'SQL', ext: 'sql', slug: 'query' },
};

export function parseCodeContent(raw) {
  const text = raw == null ? '' : String(raw);
  for (const sep of CODE_SEPARATORS) {
    const idx = text.indexOf(sep);
    if (idx !== -1) {
      return {
        description: text.slice(0, idx).trim(),
        code: text.slice(idx + sep.length).replace(/^\s+/, ''),
      };
    }
  }
  return { description: '', code: text };
}

export function isCodePost(post) {
  if (!post) return false;
  if (String(post.type || '').toLowerCase() === 'code') return true;
  const content = String(post.content || '');
  return CODE_SEPARATORS.some((sep) => content.includes(sep));
}

export function sanitizeCodeFileNameInput(input) {
  return String(input || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/^\.+/, '')
    .slice(0, 80);
}

export function normalizeCodeFileName(baseOrFull, language) {
  const meta = resolveLangMeta(language);
  const ext = meta?.ext ?? 'txt';
  const cleaned = sanitizeCodeFileNameInput(baseOrFull);
  if (!cleaned) return `${meta?.slug ?? 'snippet'}.${ext}`;

  const lastDot = cleaned.lastIndexOf('.');
  if (lastDot > 0 && lastDot < cleaned.length - 1) {
    const base = cleaned.slice(0, lastDot);
    return `${base}.${ext}`;
  }

  return `${cleaned}.${ext}`;
}

export function resolveCodeFileName(post) {
  const language = post?.code_language || post?.codeLanguage || '';
  const stored = post?.code_file_name || post?.codeFileName || '';
  return normalizeCodeFileName(stored, language);
}

export function getCodePostParts(post) {
  if (!isCodePost(post)) return null;
  const { description, code } = parseCodeContent(post.content);
  const language = post.code_language || post.codeLanguage || '';
  return {
    description,
    code,
    language,
    fileName: resolveCodeFileName(post),
  };
}

export function resolveLangMeta(language) {
  const key = String(language || '').toLowerCase();
  if (!key) return null;
  return LANG_META[key] ?? null;
}

export function resolveLangLabel(language) {
  const meta = resolveLangMeta(language);
  if (meta) return meta.label;
  if (!language) return 'Code';
  return String(language).charAt(0).toUpperCase() + String(language).slice(1);
}

export function formatCodeSize(content) {
  const bytes = new Blob([content || '']).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

export function countCodeLines(content) {
  if (!content) return 0;
  return String(content).split('\n').length;
}

export function languageExtension(language) {
  return resolveLangMeta(language)?.ext ?? 'txt';
}
