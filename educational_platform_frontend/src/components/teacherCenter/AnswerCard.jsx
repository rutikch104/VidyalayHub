// @ts-nocheck
import { useState } from 'react';
import {
  Heart,
  Bookmark,
  MessageCircle,
  Loader2,
  GraduationCap,
  ChevronDown,
} from 'lucide-react';
import SocialComposer from '@/components/social/SocialComposer';
import { useAuth } from '@/contexts/AuthContext';
import globalQuestionService from '@/services/globalQuestionService';
import RichPostText from '@/components/RichPostText';
import {
  contentWithoutHashtags,
  mergeDisplayHashtags,
} from '@/utils/socialText';
import { SOCIAL_HASHTAG_BADGE_CLASS } from '@/utils/socialTokenStyles';
import {
  formatTimeAgo,
  userDisplayName,
  avatarOrFallback,
  countDescendantReplies,
} from './teacherCenterUtils';

const INITIAL_ROOT_REPLIES = 2;

function ReplyComposer({ value, onChange, onSubmit, onCancel, submitting, placeholder, compact }) {
  return (
    <div className={compact ? 'tc-answer-thread__composer tc-answer-thread__composer--compact' : 'tc-answer-thread__composer'}>
      <SocialComposer
        variant="inline"
        mentionMode="all"
        value={value}
        onValueChange={onChange}
        onSubmit={onSubmit}
        onCancel={onCancel}
        submitting={submitting}
        placeholder={placeholder}
        showHint={false}
        submitLabel="Send"
        className="min-w-0 flex-1"
      />
    </div>
  );
}

function ReplyItem({
  reply,
  questionId,
  answerId,
  currentUser,
  replyTarget,
  replyText,
  onReplyTextChange,
  onReplyTo,
  onCancelReply,
  onSubmitReply,
  submitting,
  expandedThreads,
  onToggleThread,
  depth = 0,
}) {
  const isReplyingHere = replyTarget?.id === reply.id;
  const nestedCount = countDescendantReplies(reply.replies);
  const hasNested = nestedCount > 0;
  const isExpanded = expandedThreads.has(reply.id);
  const isNested = depth > 0;

  return (
    <li
      className={[
        'tc-answer-thread__item',
        isNested ? 'tc-answer-thread__item--nested' : '',
        isReplyingHere ? 'tc-answer-thread__item--active' : '',
      ].join(' ')}
    >
      <div className="tc-answer-thread__row">
        <img
          src={avatarOrFallback(reply.user, currentUser)}
          alt=""
          className={isNested ? 'tc-answer-thread__avatar tc-answer-thread__avatar--sm' : 'tc-answer-thread__avatar'}
        />
        <div className="min-w-0 flex-1">
          <div className="tc-answer-thread__header">
            <span className="tc-answer-thread__name">{userDisplayName(reply.user)}</span>
            <span className="tc-answer-thread__dot" aria-hidden>·</span>
            <span className="tc-answer-thread__time">{formatTimeAgo(reply.created_at)}</span>
          </div>
          <p className="tc-answer-thread__text">{reply.text}</p>
          {!isReplyingHere ? (
            <button type="button" onClick={() => onReplyTo(reply)} className="tc-answer-thread__reply-btn">
              Reply
            </button>
          ) : null}
          {isReplyingHere ? (
            <ReplyComposer
              compact
              value={replyText}
              onChange={onReplyTextChange}
              onSubmit={onSubmitReply}
              onCancel={onCancelReply}
              submitting={submitting}
              placeholder={`Reply to ${userDisplayName(reply.user)}…`}
            />
          ) : null}
        </div>
      </div>

      {hasNested ? (
        <div className="tc-answer-thread__nested">
          <div className="tc-answer-thread__rail" aria-hidden />
          <div className="tc-answer-thread__nested-body">
            <button
              type="button"
              onClick={() => onToggleThread(reply.id)}
              className="tc-answer-thread__toggle"
              aria-expanded={isExpanded}
            >
              <ChevronDown
                className={['h-4 w-4 shrink-0 transition-transform duration-200', isExpanded ? 'rotate-0' : '-rotate-90'].join(' ')}
                aria-hidden
              />
              {isExpanded ? 'Hide replies' : `View ${nestedCount} ${nestedCount === 1 ? 'reply' : 'replies'}`}
            </button>
            {isExpanded ? (
              <ul className="tc-answer-thread__list">
                {(reply.replies || []).map((child) => (
                  <ReplyItem
                    key={child.id}
                    reply={child}
                    questionId={questionId}
                    answerId={answerId}
                    currentUser={currentUser}
                    replyTarget={replyTarget}
                    replyText={replyText}
                    onReplyTextChange={onReplyTextChange}
                    onReplyTo={onReplyTo}
                    onCancelReply={onCancelReply}
                    onSubmitReply={onSubmitReply}
                    submitting={submitting}
                    expandedThreads={expandedThreads}
                    onToggleThread={onToggleThread}
                    depth={depth + 1}
                  />
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

export default function AnswerCard({
  answer,
  questionId,
  isBookmarked,
  onBookmark,
  onLikeToggle,
  onCommentAdded,
}) {
  const { user: currentUser } = useAuth();
  const [threadOpen, setThreadOpen] = useState(false);
  const [showAllRoots, setShowAllRoots] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState(() => new Set());
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roots = answer.comments || [];
  const totalReplies = answer.comments_count ?? countDescendantReplies(roots);
  const displayTags = mergeDisplayHashtags(answer.tags, answer.content);
  const displayContent = contentWithoutHashtags(answer.content);
  const visibleRoots = showAllRoots ? roots : roots.slice(0, INITIAL_ROOT_REPLIES);
  const hiddenRootCount = Math.max(0, roots.length - INITIAL_ROOT_REPLIES);

  const toggleThread = (id) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitReply = async (payload) => {
    const content = (payload?.content ?? replyText).trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      const comment = await globalQuestionService.addAnswerComment(questionId, answer.id, {
        text: content,
        parent_id: replyTarget?.id || null,
        mentioned_users: payload?.mentioned_users || [],
      });
      onCommentAdded?.(answer.id, comment);
      setReplyText('');
      setReplyTarget(null);
      setThreadOpen(true);
      if (replyTarget?.id) {
        setExpandedThreads((prev) => new Set(prev).add(replyTarget.id));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="tc-answer-card">
      <header className="tc-answer-card__header">
        <div className="tc-answer-card__author">
          <img
            src={avatarOrFallback(answer.answerer, currentUser)}
            alt=""
            className="tc-answer-card__avatar"
          />
          <div className="min-w-0">
            <div className="tc-answer-card__name-row">
              <span className="tc-answer-card__name">{userDisplayName(answer.answerer)}</span>
              {answer.answerer?.user_type === 'teacher' && (
                <span className="tc-answer-card__badge">Teacher</span>
              )}
            </div>
            <div className="tc-answer-card__meta">
              {answer.answerer?.college_name ? (
                <span className="tc-answer-card__college">
                  <GraduationCap className="h-3 w-3 shrink-0" aria-hidden />
                  {answer.answerer.college_name}
                </span>
              ) : null}
              <span>{formatTimeAgo(answer.created_at)}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onBookmark(answer.id)}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark answer'}
          className={[
            'tc-answer-card__bookmark',
            isBookmarked ? 'tc-answer-card__bookmark--saved' : '',
          ].join(' ')}
        >
          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </header>

      {displayContent ? (
        <RichPostText text={displayContent} className="tc-answer-card__content" />
      ) : null}

      {(displayTags.length > 0 || answer.mentions?.length > 0) && (
        <div className="tc-answer-card__meta-tags">
          {(answer.mentions || []).map((m) => (
            <span key={m.id || m.mentioned_user} className="tc-answer-card__mention-pill">
              @{userDisplayName(m.mentionedUser)}
            </span>
          ))}
          {displayTags.map((tag) => (
            <span key={tag} className={SOCIAL_HASHTAG_BADGE_CLASS}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      <footer className="tc-answer-card__footer">
        <button
          type="button"
          onClick={() => onLikeToggle(answer)}
          className={[
            'tc-answer-card__action',
            answer.is_liked ? 'tc-answer-card__action--liked' : '',
          ].join(' ')}
        >
          <Heart className={`h-3.5 w-3.5 ${answer.is_liked ? 'fill-current' : ''}`} />
          {answer.likes_count ?? 0}
        </button>
        <button
          type="button"
          onClick={() => {
            setThreadOpen((v) => !v);
            if (!threadOpen) setReplyTarget(null);
          }}
          className="tc-answer-card__action"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
        </button>
        {!threadOpen ? (
          <button
            type="button"
            onClick={() => {
              setThreadOpen(true);
              setReplyTarget(null);
            }}
            className="tc-answer-card__reply-link"
          >
            Reply
          </button>
        ) : null}
      </footer>

      {threadOpen ? (
        <div className="tc-answer-thread">
          {roots.length > 0 ? (
            <>
              <ul className="tc-answer-thread__list tc-answer-thread__list--roots">
                {visibleRoots.map((reply) => (
                  <ReplyItem
                    key={reply.id}
                    reply={reply}
                    questionId={questionId}
                    answerId={answer.id}
                    currentUser={currentUser}
                    replyTarget={replyTarget}
                    replyText={replyText}
                    onReplyTextChange={setReplyText}
                    onReplyTo={setReplyTarget}
                    onCancelReply={() => {
                      setReplyTarget(null);
                      setReplyText('');
                    }}
                    onSubmitReply={submitReply}
                    submitting={submitting}
                    expandedThreads={expandedThreads}
                    onToggleThread={toggleThread}
                  />
                ))}
              </ul>
              {hiddenRootCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllRoots((v) => !v)}
                  className="tc-answer-thread__expand"
                >
                  {showAllRoots
                    ? 'Show fewer replies'
                    : `View ${hiddenRootCount} more ${hiddenRootCount === 1 ? 'reply' : 'replies'}`}
                </button>
              ) : null}
            </>
          ) : (
            <p className="tc-answer-thread__empty">No replies yet. Start the conversation.</p>
          )}

          {!replyTarget ? (
            <ReplyComposer
              value={replyText}
              onChange={setReplyText}
              onSubmit={submitReply}
              submitting={submitting}
              placeholder="Reply to this answer…"
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
