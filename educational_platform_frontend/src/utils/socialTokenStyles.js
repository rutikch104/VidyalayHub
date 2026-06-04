/**
 * Platform-standard styles for inline @mentions and #hashtags
 * (LinkedIn / Instagram: bold charcoal tags, blue interactive mentions).
 */

/** @mention in post/comment body — premium brand blue, interactive */
export const SOCIAL_MENTION_CLASS =
  'cursor-pointer font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300';

/** #hashtag inline in body — structural charcoal, no accent color */
export const SOCIAL_HASHTAG_CLASS =
  'font-semibold text-stone-900 hover:underline dark:text-stone-100';

/** Hashtag chips shown below posts (deduped from body) */
export const SOCIAL_HASHTAG_BADGE_CLASS =
  'inline-flex items-center font-semibold text-stone-900 transition-colors hover:underline dark:text-stone-100';

/** Back-compat aliases used by RichPostText exports */
export const socialMentionClass = SOCIAL_MENTION_CLASS;
export const socialHashtagClass = SOCIAL_HASHTAG_CLASS;
