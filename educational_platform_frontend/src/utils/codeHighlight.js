const KEYWORDS = new Set([
  'export', 'import', 'from', 'as', 'default', 'function', 'const', 'let', 'var', 'return',
  'if', 'else', 'elif', 'while', 'for', 'do', 'switch', 'case', 'break', 'continue',
  'class', 'interface', 'type', 'extends', 'implements', 'new', 'this', 'super',
  'async', 'await', 'try', 'catch', 'finally', 'throw', 'public', 'private', 'protected',
  'static', 'void', 'def', 'lambda', 'pass', 'yield', 'raise', 'with', 'in', 'is',
  'true', 'false', 'null', 'undefined', 'nil', 'self', 'fn', 'mut', 'pub', 'struct',
  'enum', 'match', 'where', 'use', 'package', 'func', 'go', 'defer', 'select',
]);

const TYPES = new Set([
  'number', 'string', 'boolean', 'void', 'any', 'unknown', 'never', 'object', 'int', 'float',
  'double', 'char', 'long', 'short', 'byte', 'Array', 'Promise',
]);

const TOKEN_RE = new RegExp(
  [
    String.raw`('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|` + '`(?:\\.|[^`\\\\])*`)',
    String.raw`\b\d+(?:\.\d+)?\b`,
    String.raw`\bnumber\[\]|\bstring\[\]|\bboolean\[\]|\bArray<[^>]+>|\bPromise<[^>]+>`,
    String.raw`\b[A-Za-z_][\w$]*\b`,
    String.raw`\/\/[^\n]*`,
    String.raw`[+\-*/%=<>!&|^~?:;,.()[\]{}]+`,
  ].join('|'),
  'g',
);

function classifyToken(text, language, nextChar) {
  if (text.startsWith('//')) return 'comment';
  if (
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith('`') && text.endsWith('`'))
  ) {
    return 'string';
  }
  if (/^\d/.test(text)) return 'number';
  if (text.includes('[]') || text.includes('<') || TYPES.has(text)) return 'type';
  const lower = text.toLowerCase();
  if (KEYWORDS.has(lower)) return 'keyword';
  if ((language === 'typescript' || language === 'javascript') && nextChar === '(') {
    return 'function';
  }
  if (/^[+\-*/%=<>!&|^~?:;,.()[\]{}]+$/.test(text)) return 'operator';
  return 'plain';
}

/** @returns {{ type: string, text: string }[]} */
export function tokenizeCodeLine(line, language = '') {
  const lang = String(language || '').toLowerCase();
  const tokens = [];
  let match;

  TOKEN_RE.lastIndex = 0;
  let lastIndex = 0;

  while ((match = TOKEN_RE.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'plain', text: line.slice(lastIndex, match.index) });
    }
    const text = match[0];
    const nextChar = line[TOKEN_RE.lastIndex];
    tokens.push({ type: classifyToken(text, lang, nextChar), text });
    lastIndex = TOKEN_RE.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: 'plain', text: line.slice(lastIndex) });
  }

  if (!tokens.length) tokens.push({ type: 'plain', text: line || ' ' });
  return tokens;
}
