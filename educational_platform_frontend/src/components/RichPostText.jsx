import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { parseSocialText } from '@/utils/socialText';
import {
  SOCIAL_HASHTAG_CLASS,
  SOCIAL_MENTION_CLASS,
  socialHashtagClass,
  socialMentionClass,
} from '@/utils/socialTokenStyles';
import { useProfileNavigationOptional } from '@/contexts/ProfileNavigationContext';

export { socialMentionClass, socialHashtagClass };

/** Inline spans for composer mirror (must match RichPostText visually). */
export function SocialTextSpans({ text }) {
  const segments = useMemo(() => parseSocialText(text ?? ''), [text]);
  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === 'mention') {
          return (
            <span key={idx} className={SOCIAL_MENTION_CLASS}>
              {seg.value}
            </span>
          );
        }
        if (seg.type === 'hashtag') {
          return (
            <span key={idx} className={SOCIAL_HASHTAG_CLASS}>
              {seg.value}
            </span>
          );
        }
        return (
          <span key={idx} className="text-foreground">
            {seg.value}
          </span>
        );
      })}
    </>
  );
}

/**
 * Renders post/comment body with styled @mentions and #hashtags.
 * Tokenization: {@link parseSocialText} in `@/utils/socialText`.
 * Mentions are clickable when profile navigation is available.
 */
export default function RichPostText({ text, className, as: Component = 'p', mentionUserMap = null }) {
  const segments = useMemo(() => parseSocialText(text ?? ''), [text]);
  const profileNav = useProfileNavigationOptional();

  return (
    <Component
      className={cn('whitespace-pre-wrap leading-relaxed text-foreground', className)}
    >
      {segments.map((seg, idx) => {
        if (seg.type === 'mention') {
          const token = seg.value.slice(1);
          const userId = mentionUserMap?.[token.toLowerCase()];
          if (userId && profileNav?.openProfile) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => profileNav.openProfile(userId)}
                className={SOCIAL_MENTION_CLASS}
              >
                {seg.value}
              </button>
            );
          }
          return (
            <span key={idx} className={SOCIAL_MENTION_CLASS}>
              {seg.value}
            </span>
          );
        }
        if (seg.type === 'hashtag') {
          return (
            <span key={idx} className={SOCIAL_HASHTAG_CLASS}>
              {seg.value}
            </span>
          );
        }
        return <span key={idx}>{seg.value}</span>;
      })}
    </Component>
  );
}
