import { extractHashtagNamesFromText } from '@/utils/socialText';

/** Build API payload from composer text + tracked mention users. */
export function buildComposerPayload(text, mentionedUsers = []) {
  const content = String(text || '').trim();
  return {
    content,
    tags: extractHashtagNamesFromText(content),
    mentioned_users: (mentionedUsers || []).map((u) => String(u.id || u)),
  };
}
