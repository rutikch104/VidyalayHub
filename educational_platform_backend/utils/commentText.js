const MAX_COMMENT_LENGTH = 2000;

/** Strip HTML-like tags and normalize whitespace for stored comment text. */
function sanitizeCommentText(raw) {
  if (raw == null) return '';
  let text = String(raw)
    .replace(/<[^>]*>/g, '')
    .replace(/\u0000/g, '')
    .trim();
  if (text.length > MAX_COMMENT_LENGTH) {
    text = text.slice(0, MAX_COMMENT_LENGTH);
  }
  return text;
}

module.exports = { sanitizeCommentText, MAX_COMMENT_LENGTH };
