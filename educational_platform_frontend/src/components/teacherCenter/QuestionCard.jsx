// @ts-nocheck
import {
  Heart,
  Bookmark,
  CheckCircle2,
  GraduationCap,
  Clock,
  ArrowRight,
  User,
  Reply,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  formatTimeAgo,
  userDisplayName,
  avatarOrFallback,
  questionStatus,
} from './teacherCenterUtils';

function StatusBadge({ status }) {
  return (
    <span className={`tc-q-card__status tc-q-card__status--${status.id}`}>
      {status.id === 'resolved' ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
      {status.label}
    </span>
  );
}

function ContextLine({ college, time }) {
  if (!college && !time) return null;
  return (
    <p className="tc-q-card__context-line">
      {college ? (
        <span className="tc-q-card__context-item">
          <GraduationCap className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{college}</span>
        </span>
      ) : null}
      {college && time ? <span className="tc-q-card__context-sep" aria-hidden>·</span> : null}
      {time ? (
        <span className="tc-q-card__context-item">
          <Clock className="h-3 w-3 shrink-0" aria-hidden />
          {time}
        </span>
      ) : null}
    </p>
  );
}

export default function QuestionCard({
  question,
  isLiked,
  isBookmarked,
  onLike,
  onBookmark,
  onOpen,
}) {
  const { user: currentUser } = useAuth();
  const q = question;
  const tags = Array.isArray(q.tags) ? q.tags : [];
  const mentions = (q.mentions || [])
    .map((m) => userDisplayName(m.mentionedUser))
    .filter(Boolean);
  const status = questionStatus(q);
  const answers = q.answers_count ?? 0;
  const college = !q.is_anonymous ? q.asker?.college_name : null;
  const postedTime = formatTimeAgo(q.created_at);

  return (
    <article className="tc-q-card social-card social-card--interactive">
      <header className="tc-q-card__header">
        <div className="tc-q-card__header-row">
          <div className="tc-q-card__author">
            {q.is_anonymous ? (
              <div className="tc-q-card__avatar tc-q-card__avatar--anon" aria-hidden>
                <User className="h-4 w-4" />
              </div>
            ) : (
              <img
                src={avatarOrFallback(q.asker, currentUser)}
                alt=""
                className="tc-q-card__avatar"
              />
            )}
            <div className="min-w-0">
              <p className="tc-q-card__author-name">
                {q.is_anonymous ? 'Anonymous' : userDisplayName(q.asker)}
              </p>
              <ContextLine college={college} time={postedTime} />
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </header>

      <div className="tc-q-card__body">
        <button type="button" onClick={() => onOpen(q)} className="tc-q-card__title">
          {q.title || 'Untitled'}
        </button>
        {q.description ? (
          <p className="tc-q-card__desc">{q.description}</p>
        ) : null}
      </div>

      {(tags.length > 0 || mentions.length > 0) && (
        <div className="tc-q-card__tags">
          {tags.slice(0, 4).map((tag) => (
            <span key={tag} className="tc-q-card__tag">
              #{tag}
            </span>
          ))}
          {mentions.slice(0, 3).map((name) => (
            <span key={name} className="tc-q-card__tag tc-q-card__tag--mention">
              @{name}
            </span>
          ))}
        </div>
      )}

      <footer className="tc-q-card__footer">
        <div className="tc-q-card__metrics">
          <span className="tc-q-card__metric">
            <Reply className="h-3.5 w-3.5" aria-hidden />
            {answers} {answers === 1 ? 'answer' : 'answers'}
          </span>
        </div>

        <div className="tc-q-card__actions">
          <button
            type="button"
            onClick={() => onLike(q.id)}
            aria-label={isLiked ? 'Unlike question' : 'Like question'}
            className={[
              'tc-q-card__action-btn',
              isLiked ? 'tc-q-card__action-btn--liked' : '',
            ].join(' ')}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            {q.likes_count ?? 0}
          </button>
          <button
            type="button"
            onClick={() => onBookmark(q.id)}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
            className={[
              'tc-q-card__action-btn',
              isBookmarked ? 'tc-q-card__action-btn--saved' : '',
            ].join(' ')}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          <button type="button" onClick={() => onOpen(q)} className="tc-q-card__view-btn">
            View
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </footer>
    </article>
  );
}
