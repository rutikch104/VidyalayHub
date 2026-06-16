import { Megaphone, BadgeCheck } from 'lucide-react';
import ClickableUser from '@/components/ui/ClickableUser';
import RichPostText from '@/components/RichPostText';
import AcademicIdentityLine from '@/components/user/AcademicIdentityLine';
import PostCard from '@/components/PostCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const FALLBACK_AVATAR =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo`;
  return `${Math.floor(diff / 31536000)}y`;
}

function isVerifiedAuthor(u) {
  const t = String(u?.user_type || u?.role || u?.title || '').toLowerCase();
  return ['teacher', 'faculty', 'admin', 'professor', 'institution', 'super'].some((k) => t.includes(k));
}

function AmplifyAuthorHeader({ user, timestamp }) {
  const name = user?.name || user?.full_name || 'User';
  const avatarUrl = user?.avatar_url || user?.profile_picture || FALLBACK_AVATAR;

  return (
    <div className="feed-post__author-block">
      <ClickableUser
        userId={user?.id}
        name={name}
        avatarUrl={avatarUrl}
        size="md"
        className="shrink-0"
      />
      <div className="feed-post__author-meta feed-post__author-meta--stacked">
        <div className="feed-post__name-row">
          <ClickableUser
            userId={user?.id}
            name={name}
            showName
            showAvatar={false}
            showStatus={false}
            nameClassName="feed-post__author-name"
            className="inline-flex !gap-0 !p-0 hover:!bg-transparent"
          />
          {isVerifiedAuthor(user) ? (
            <span className="feed-post__verified" aria-label="Verified">
              <BadgeCheck strokeWidth={3} />
            </span>
          ) : null}
        </div>
        <AcademicIdentityLine
          user={user}
          className="academic-identity-line--feed feed-post__identity-line"
          showProfessional
        />
        {timestamp ? (
          <time className="feed-post__timestamp-stacked" dateTime={timestamp}>
            {formatTimeAgo(timestamp)}
          </time>
        ) : null}
      </div>
    </div>
  );
}

export default function AmplifiedPostCard({
  item,
  onPostDeleted,
  onPostEdited,
  onNavigate,
  onAmplifyRemoved,
}) {
  const amplifier = item.amplifier;
  const originalPost = item.original_post;
  if (!amplifier || !originalPost) return null;

  const handleAmplifyRemoved = (res) => {
    onAmplifyRemoved?.(item, res);
  };

  return (
    <article
      className="social-feed-card feed-amplify-card"
      id={`amplify-${item.amplify_id || item.id}`}
    >
      <header className="feed-amplify-card__header">
        <AmplifyAuthorHeader
          user={amplifier}
          timestamp={item.amplified_at}
        />
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="feed-amplify-card__badge"
                tabIndex={0}
                aria-label="Amplified this post"
              >
                <Megaphone className="h-3.5 w-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="feed-amplify-card__tooltip">
              Amplified this post
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </header>

      {item.amplify_comment ? (
        <div className="feed-amplify-card__comment">
          <RichPostText text={item.amplify_comment} className="feed-amplify-card__comment-text" />
        </div>
      ) : null}

      <div className="feed-amplify-card__original-wrap">
        <div className="feed-amplify-card__original">
          <PostCard
            post={originalPost}
            embedded
            onPostDeleted={onPostDeleted}
            onPostEdited={onPostEdited}
            onNavigate={onNavigate}
            onAmplified={handleAmplifyRemoved}
          />
        </div>
      </div>
    </article>
  );
}
