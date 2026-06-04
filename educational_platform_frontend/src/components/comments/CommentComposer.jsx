import { Loader2, Send, Smile } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/ui/UserAvatar';
import { PRESENCE_STATUS } from '@/lib/presence';
import { COPY } from '@/lib/copy';
import SocialComposer from '@/components/social/SocialComposer';

const FALLBACK_AVATAR =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';

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

  const handleSubmit = (payload) => {
    if (!payload?.content?.trim() || submitting) return;
    onSubmit?.(payload);
  };

  return (
    <div className={compact ? 'comment-inline-composer' : 'comment-composer'}>
      <UserAvatar
        src={user?.avatar_url || FALLBACK_AVATAR}
        alt={user?.name || 'You'}
        size={compact ? 'xs' : 'comment'}
        status={PRESENCE_STATUS.ONLINE}
        fallbackSrc={FALLBACK_AVATAR}
        className={compact ? 'comment-avatar-slot-sm' : 'comment-avatar-slot'}
      />
      <div className="min-w-0 flex-1">
        <SocialComposer
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
          showHint={!compact}
          className="social-composer--comment"
        />
        {!compact && (
          <div className="comment-composer-actions mt-1">
            <button
              type="button"
              className="comment-action inline-flex items-center gap-1"
              aria-label="Add emoji"
              tabIndex={-1}
            >
              <Smile className="h-4 w-4" />
              <span className="hidden sm:inline">{COPY.comments.emoji}</span>
            </button>
            <span className="text-xs text-muted-foreground">{COPY.comments.hint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
