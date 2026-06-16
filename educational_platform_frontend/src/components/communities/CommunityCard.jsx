// @ts-nocheck
import { useState } from 'react';
import {
  Users,
  Sparkles,
  Globe,
  Lock,
  Crown,
  Check,
  Loader2,
  ArrowUpRight,
  BadgeCheck,
  MessageCircle,
} from 'lucide-react';
import {
  mediaOrFallback,
  FALLBACK_COVER,
  FALLBACK_AVATAR,
  formatCompactCount,
  communityInitials,
  getCommunityTheme,
  formatCategoryLabel,
} from './communityUtils';

export default function CommunityCard({ community, onOpen, onJoinToggle, joinLoading }) {
  const [hoverJoined, setHoverJoined] = useState(false);
  const isJoined = !!community.is_member;
  const hasDescription = Boolean(community.description?.trim());
  const memberCount = community.member_count ?? 0;
  const postCount = community.post_count ?? 0;
  const theme = getCommunityTheme(community.category);
  const tags = (community.tags || []).filter(Boolean).slice(0, 4);
  const categoryLabel = formatCategoryLabel(community.category);

  const isRecentlyActive = community.updated_at
    ? Date.now() - new Date(community.updated_at).getTime() < 7 * 86_400_000
    : false;

  const coverSrc = mediaOrFallback(community.cover_url, FALLBACK_COVER);
  const avatarSrc = community.avatar_url ? mediaOrFallback(community.avatar_url, FALLBACK_AVATAR) : null;
  const hasCustomCover = Boolean(community.cover_url?.trim());

  const handleJoinClick = (e) => {
    e.stopPropagation();
    onJoinToggle(community);
  };

  const handleViewClick = (e) => {
    e.stopPropagation();
    onOpen(community);
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => onOpen(community)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(community);
      }}
      className={[
        'comm-card comm-card--lovable',
        `comm-card--theme-${theme}`,
        isJoined ? 'comm-card--member' : '',
        community.is_featured ? 'comm-card--featured' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="comm-card__glow" aria-hidden />

      <div className="comm-card__hero">
        {hasCustomCover ? (
          <img src={coverSrc} alt="" loading="lazy" className="comm-card__hero-img" />
        ) : null}
        <div className="comm-card__hero-gradient" aria-hidden />

        <div className="comm-card__hero-badges">
          {community.is_featured ? (
            <span className="comm-card__badge comm-card__badge--featured">
              <Sparkles className="h-3 w-3" aria-hidden />
              Featured
            </span>
          ) : (
            <span className="comm-card__hero-badges-spacer" aria-hidden />
          )}
          <span
            className={[
              'comm-card__badge',
              community.is_private ? 'comm-card__badge--private' : 'comm-card__badge--public',
            ].join(' ')}
          >
            {community.is_private ? (
              <Lock className="h-3 w-3" aria-hidden />
            ) : (
              <Globe className="h-3 w-3" aria-hidden />
            )}
            {community.is_private ? 'Private' : 'Public'}
          </span>
        </div>
      </div>

      <div className="comm-card__body">
        <div className="comm-card__identity">
          <div className="comm-card__logo-wrap">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" loading="lazy" className="comm-card__logo" />
            ) : (
              <div className="comm-card__logo comm-card__logo--initials" aria-hidden>
                {communityInitials(community.name)}
              </div>
            )}
            {community.role === 'admin' && (
              <span className="comm-card__admin-badge" title="You are an admin">
                <Crown className="h-3 w-3" aria-hidden />
              </span>
            )}
          </div>

          {community.category ? (
            <div className="comm-card__category-row">
              <span className="comm-card__category-pill"># {categoryLabel.toUpperCase()}</span>
            </div>
          ) : null}

          <div className="comm-card__title-row">
            <h3 className="comm-card__title">{community.name}</h3>
            {(community.is_featured || community.role === 'admin') && (
              <BadgeCheck className="comm-card__verified h-4 w-4 shrink-0" aria-hidden />
            )}
          </div>

          <p
            className={[
              'comm-card__description',
              !hasDescription ? 'comm-card__description--placeholder' : '',
            ].join(' ')}
          >
            {hasDescription ? community.description : 'Join the conversation in this community.'}
          </p>
        </div>

        <div className="comm-card__stats-bar">
          <span className="comm-card__stat">
            <Users className="h-3.5 w-3.5" aria-hidden />
            <strong>{formatCompactCount(memberCount)}</strong> members
          </span>
          {isRecentlyActive ? (
            <span className="comm-card__stat comm-card__stat--active">
              <span className="comm-card__active-dot" aria-hidden />
              Active
            </span>
          ) : null}
          <span className="comm-card__stat">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            <strong>{formatCompactCount(postCount)}</strong> posts
          </span>
        </div>

        {tags.length > 0 ? (
          <div className="comm-card__tags">
            {tags.map((tag) => (
              <span key={tag} className="comm-card__tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="comm-card__actions">
          <button
            type="button"
            disabled={joinLoading}
            onClick={handleJoinClick}
            onMouseEnter={() => setHoverJoined(true)}
            onMouseLeave={() => setHoverJoined(false)}
            className={[
              'comm-card__btn comm-card__btn--primary',
              isJoined
                ? hoverJoined
                  ? 'comm-card__btn--leave'
                  : 'comm-card__btn--joined'
                : '',
            ].join(' ')}
          >
            {joinLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isJoined ? (
              hoverJoined ? (
                'Leave'
              ) : (
                <>
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  Joined
                </>
              )
            ) : community.is_private ? (
              'Request to join'
            ) : (
              'Join community'
            )}
          </button>
          <button
            type="button"
            onClick={handleViewClick}
            className="comm-card__btn comm-card__btn--view"
            aria-label={`View ${community.name}`}
          >
            View
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
