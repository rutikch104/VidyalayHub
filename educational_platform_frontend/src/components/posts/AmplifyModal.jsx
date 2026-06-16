import { useEffect, useState } from 'react';
import { Megaphone, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import postService from '@/services/postService';
import { emitNotificationsChanged } from '@/services/notificationService';

const MAX_COMMENT = 500;

export default function AmplifyModal({
  open,
  onOpenChange,
  post,
  onAmplified,
}) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setComment('');
    setError('');
  }, [open, post?.id]);

  const original = post?.original_post || post;
  const postId = original?.id;

  const handleAmplify = async () => {
    if (!postId || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await postService.amplifyPost(postId, {
        comment: comment.trim() || null,
      });
      emitNotificationsChanged();
      onAmplified?.(res);
      onOpenChange?.(false);
    } catch (err) {
      console.error(err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Could not amplify this post.';
      setError(message);
      if (err?.response?.status === 409) {
        onAmplified?.(err.response?.data?.data || { is_amplified: true, is_reposted: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const preview = (original?.content || '').trim().slice(0, 160);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="amplify-modal sm:max-w-lg">
        <DialogHeader className="amplify-modal__header">
          <div className="amplify-modal__title-row">
            <span className="amplify-modal__icon-wrap" aria-hidden>
              <Megaphone className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="amplify-modal__title">Amplify this post</DialogTitle>
              <DialogDescription className="amplify-modal__desc">
                Share this post with your network. You can only amplify each post once.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {preview ? (
          <blockquote className="amplify-modal__preview">
            <p>{preview}{preview.length >= 160 ? '…' : ''}</p>
            {original?.user?.name ? (
              <footer>— {original.user.name}</footer>
            ) : null}
          </blockquote>
        ) : null}

        <label className="amplify-modal__label" htmlFor="amplify-comment">
          Add your thoughts <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="amplify-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          placeholder="Share why this post matters to your peers…"
          className="amplify-modal__textarea app-input min-h-[96px] resize-none"
          rows={4}
          disabled={loading}
        />
        <p className="amplify-modal__counter">{comment.length}/{MAX_COMMENT}</p>

        {error ? <p className="amplify-modal__error">{error}</p> : null}

        <div className="amplify-modal__actions">
          <button
            type="button"
            className="amplify-modal__btn amplify-modal__btn--secondary"
            onClick={() => onOpenChange?.(false)}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="amplify-modal__btn amplify-modal__btn--primary"
            onClick={handleAmplify}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Amplify'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
