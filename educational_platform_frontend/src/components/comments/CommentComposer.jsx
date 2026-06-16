import { useEffect, useRef } from 'react';
import { AtSign, Hash, Loader2, Send, Smile } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/ui/UserAvatar';
import ComposerEmojiPicker from '@/components/composer/ComposerEmojiPicker';
import { PRESENCE_STATUS } from '@/lib/presence';
import { COPY } from '@/lib/copy';
import SocialComposer from '@/components/social/SocialComposer';
import { cn } from '@/lib/utils';

const FALLBACK_AVATAR =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';

const MAX_COMMENT_CHARS = 2000;

/**
 * Feed / post comment composer with @mentions and #hashtags.
 * onSubmit receives { content, tags, mentioned_users }.
 */
export default function CommentComposer({
  value,
  onChange,
  onSubmit,
  submitting = false,
  placeholder,
  compact = false,
  autoFocus = false,
  onCancel,
  submitLabel,
}) {
  const { user } = useAuth();
  const composerRef = useRef(null);
  const charCount = (value || '').length;
  const atLimit = charCount >= MAX_COMMENT_CHARS;
  const canPost = Boolean(value?.trim());

  const handleSubmit = (payload) => {
    if (!payload?.content?.trim() || submitting) return;
    onSubmit?.(payload);
  };

  const handlePost = () => {
    composerRef.current?.submit?.();
  };

  const insertSnippet = (snippet) => {
    composerRef.current?.insertAtCursor?.(snippet);
    composerRef.current?.focus?.();
  };

  useEffect(() => {
    if (!autoFocus) return undefined;
    const id = requestAnimationFrame(() => composerRef.current?.focus?.());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  return (
    <div className={cn('comment-composer-card', compact && 'comment-composer-card--compact')}>
      <div className="comment-composer-card__body">
        <UserAvatar
          src={user?.avatar_url || FALLBACK_AVATAR}
          alt={user?.name || 'You'}
          size={compact ? 'xs' : 'comment'}
          status={PRESENCE_STATUS.ONLINE}
          pulse={false}
          fallbackSrc={FALLBACK_AVATAR}
          className={compact ? 'comment-avatar-slot-sm' : 'comment-avatar-slot'}
        />
        <div className="comment-composer-card__field">
          <SocialComposer
            ref={composerRef}
            id={compact ? 'comment-composer-inline' : 'comment-composer'}
            variant={compact ? 'inline' : 'boxed'}
            mentionMode="all"
            value={value}
            onValueChange={onChange}
            onSubmit={handleSubmit}
            submitting={submitting}
            onCancel={onCancel}
            submitLabel={submitLabel || COPY.comments.post}
            placeholder={placeholder || COPY.comments.placeholder}
            showHint={false}
            hideFooter
            rows={compact ? 1 : 2}
            className="social-composer--comment"
          />
        </div>
      </div>

      <div className="comment-composer-card__toolbar">
        <div className="comment-composer-card__tools">
          <button
            type="button"
            className="comment-composer-card__tool"
            aria-label="Mention someone"
            onClick={() => insertSnippet('@')}
          >
            <AtSign className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className="comment-composer-card__tool"
            aria-label="Add hashtag"
            onClick={() => insertSnippet('#')}
          >
            <Hash className="h-3.5 w-3.5" aria-hidden />
          </button>
          <ComposerEmojiPicker onSelect={(emoji) => insertSnippet(emoji)}>
            <button
              type="button"
              className="comment-composer-card__tool"
              aria-label="Add emoji"
            >
              <Smile className="h-3.5 w-3.5" aria-hidden />
            </button>
          </ComposerEmojiPicker>
        </div>

        {!compact ? (
          <span className="comment-composer-card__shortcut">{COPY.comments.hint}</span>
        ) : null}

        <div className="comment-composer-card__toolbar-end">
          <span
            className={cn(
              'comment-composer-card__count',
              atLimit && 'comment-composer-card__count--warn',
            )}
          >
            {charCount}/{MAX_COMMENT_CHARS}
          </span>

          {onCancel ? (
            <button type="button" className="comment-composer-card__cancel" onClick={onCancel}>
              {COPY.comments.cancel}
            </button>
          ) : null}

          <button
            type="button"
            className={cn(
              'comment-composer-card__post',
              canPost || submitting
                ? 'comment-composer-card__post--ready'
                : 'comment-composer-card__post--disabled',
              submitting && 'comment-composer-card__post--loading',
            )}
            disabled={!canPost || submitting}
            onClick={handlePost}
            aria-busy={submitting}
            aria-label={submitting ? COPY.comments.posting : submitLabel || COPY.comments.post}
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                {COPY.comments.posting}
              </>
            ) : (
              <>
                <Send aria-hidden />
                {submitLabel || COPY.comments.post}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
