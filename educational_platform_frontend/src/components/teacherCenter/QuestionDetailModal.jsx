// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  X,
  Heart,
  Loader2,
  CheckCircle2,
  RotateCcw,
  MessageCircle,
  GraduationCap,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AnswerCard from './AnswerCard';
import TcSocialComposer from './TcSocialComposer';
import {
  formatTimeAgo,
  userDisplayName,
  avatarOrFallback,
  questionStatus,
  sortAnswersByNewest,
} from './teacherCenterUtils';

const INITIAL_ANSWERS_SHOWN = 3;

export default function QuestionDetailModal({
  question,
  loading,
  onClose,
  user,
  canManageResolution,
  onResolve,
  resolving,
  isLiked,
  onLike,
  bookmarkedAnswerIds,
  onBookmarkAnswer,
  onAnswerLike,
  onAnswerComment,
  onSubmitAnswer,
  popularTags = [],
}) {
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!question) return undefined;
    setShowAllAnswers(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [question?.id, onClose]);

  if (!question) return null;

  const q = question;
  const answers = sortAnswersByNewest(q.answers || []);
  const comments = q.comments || [];
  const status = questionStatus(q);
  const hiddenCount = Math.max(0, answers.length - INITIAL_ANSWERS_SHOWN);
  const visibleAnswers = showAllAnswers ? answers : answers.slice(0, INITIAL_ANSWERS_SHOWN);

  const handleAnswer = async (payload) => {
    if (!payload?.content?.trim() || submittingAnswer) return;
    setSubmittingAnswer(true);
    try {
      await onSubmitAnswer(payload);
      setShowAllAnswers(true);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  return (
    <div className="tc-detail-modal" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="tc-detail-title">
      <div className="tc-detail-modal__dialog" onClick={(e) => e.stopPropagation()}>
        <header className="tc-detail-modal__header">
          <div className="tc-detail-modal__header-main min-w-0 flex-1">
            <div className="tc-detail-modal__author-row">
              {q.is_anonymous ? (
                <div className="tc-q-card__avatar tc-q-card__avatar--anon">
                  <User className="h-4 w-4" aria-hidden />
                </div>
              ) : (
                <img
                  src={avatarOrFallback(q.asker, currentUser)}
                  alt=""
                  className="tc-q-card__avatar"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="tc-detail-modal__author-name">
                  {q.is_anonymous ? 'Anonymous' : userDisplayName(q.asker)}
                </p>
                <p className="tc-q-card__context-line tc-q-card__context-line--detail">
                  {!q.is_anonymous && q.asker?.college_name ? (
                    <>
                      <span className="tc-q-card__context-item">
                        <GraduationCap className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{q.asker.college_name}</span>
                      </span>
                      <span className="tc-q-card__context-sep" aria-hidden>·</span>
                    </>
                  ) : null}
                  <span className="tc-q-card__context-item">
                    <Clock className="h-3 w-3 shrink-0" aria-hidden />
                    {formatTimeAgo(q.created_at)}
                  </span>
                </p>
              </div>
              <div className="tc-detail-modal__author-actions">
                <span className={`tc-q-card__status tc-q-card__status--${status.id}`}>
                  {status.id === 'resolved' ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
                  {status.label}
                </span>
                <button
                  type="button"
                  onClick={() => onLike(q.id)}
                  aria-label={isLiked ? 'Unlike question' : 'Like question'}
                  className={[
                    'tc-detail-modal__like-btn',
                    isLiked ? 'tc-detail-modal__like-btn--active' : '',
                  ].join(' ')}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  {q.likes_count ?? 0}
                </button>
              </div>
            </div>

            {(canManageResolution || (q.mentions || []).length > 0) && (
              <div className="tc-detail-modal__header-toolbar">
                {canManageResolution ? (
                  !q.is_resolved ? (
                    <button
                      type="button"
                      disabled={resolving}
                      onClick={() => onResolve(true)}
                      className="tc-detail-modal__resolve-btn tc-detail-modal__resolve-btn--primary"
                    >
                      {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Mark resolved
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={resolving}
                      onClick={() => onResolve(false)}
                      className="tc-detail-modal__resolve-btn"
                    >
                      {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      Reopen question
                    </button>
                  )
                ) : null}
                {(q.mentions || []).length > 0 ? (
                  <div className="tc-detail-modal__mentions">
                    {(q.mentions || []).map((m) => (
                      <span key={m.id || m.mentioned_user} className="tc-detail-modal__mention">
                        <img
                          src={avatarOrFallback(m.mentionedUser, currentUser)}
                          alt=""
                          className="tc-detail-modal__mention-avatar"
                        />
                        {userDisplayName(m.mentionedUser)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <button type="button" onClick={onClose} className="tc-detail-modal__close" aria-label="Close discussion">
            <X className="h-5 w-5" />
          </button>
        </header>

        <section className="tc-detail-modal__question-sticky">
          <h2 id="tc-detail-title" className="tc-detail-modal__title">
            {q.title}
          </h2>

          {q.description ? (
            <p className="tc-detail-modal__desc">{q.description}</p>
          ) : null}

          {(q.tags || []).length > 0 && (
            <div className="tc-detail-modal__tags">
              {q.tags.map((tag) => (
                <span key={tag} className="tc-q-card__tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </section>

        <div className="tc-detail-modal__scroll">
          {loading ? (
            <div className="tc-detail-modal__loading">
              <Loader2 className="h-5 w-5 animate-spin text-violet-600" aria-hidden />
              <span>Loading latest discussion…</span>
            </div>
          ) : null}

          <section className="tc-detail-modal__answers">
            <div className="tc-detail-modal__section-head">
              <h4 className="tc-detail-modal__section-title">
                <MessageCircle className="h-4 w-4 text-violet-600" aria-hidden />
                {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
              </h4>
            </div>

            {answers.length === 0 ? (
              <div className="tc-detail-modal__answers-empty">
                <MessageCircle className="h-8 w-8 text-muted-foreground/40" aria-hidden />
                <p>No answers yet</p>
                <span>Teachers and peers from any college can respond.</span>
              </div>
            ) : (
              <>
                <div className="tc-detail-modal__answers-list">
                  {visibleAnswers.map((a) => (
                    <AnswerCard
                      key={a.id}
                      answer={a}
                      questionId={q.id}
                      isBookmarked={bookmarkedAnswerIds.has(a.id)}
                      onBookmark={onBookmarkAnswer}
                      onLikeToggle={onAnswerLike}
                      onCommentAdded={onAnswerComment}
                    />
                  ))}
                </div>

                {hiddenCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllAnswers((v) => !v)}
                    className="tc-detail-modal__expand-btn"
                  >
                    {showAllAnswers ? (
                      <>
                        <ChevronUp className="h-4 w-4" aria-hidden />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" aria-hidden />
                        View {hiddenCount} more {hiddenCount === 1 ? 'answer' : 'answers'}
                      </>
                    )}
                  </button>
                ) : null}
              </>
            )}
          </section>
        </div>

        <footer className="tc-detail-modal__footer">
          <label className="tc-detail-modal__footer-label" htmlFor="tc-answer-input">
            Your answer
          </label>
          <TcSocialComposer
            id="tc-answer-input"
            popularTags={popularTags}
            submitting={submittingAnswer}
            onSubmit={handleAnswer}
            submitLabel="Post answer"
          />
        </footer>
      </div>
    </div>
  );
}
