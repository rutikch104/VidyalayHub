// @ts-nocheck
import { useState } from 'react';
import {
  Users,
  TrendingUp,
  Globe,
  Lock,
  Crown,
  Check,
  Loader2,
  ArrowUpRight,
} from 'lucide-react';
import {
  mediaOrFallback,
  FALLBACK_COVER,
  FALLBACK_AVATAR,
  formatCountLabel,
} from './communityUtils';

export default function CommunityCard({ community, onOpen, onJoinToggle, joinLoading }) {
  const [hoverJoined, setHoverJoined] = useState(false);
  const isJoined = !!community.is_member;
  const hasDescription = Boolean(community.description?.trim());
  const memberCount = community.member_count ?? 0;
  const isRecentlyActive = community.last_post_at
    ? Date.now() - new Date(community.last_post_at).getTime() < 86_400_000
    : false;

  const handleJoinClick = (e) => {
    e.stopPropagation();
    onJoinToggle(community);
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
        'comm-card group/item',
        isJoined ? 'comm-card--member' : '',
        community.is_featured ? 'comm-card--featured' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="comm-card__cover">
        <img
          src={mediaOrFallback(community.cover_url, FALLBACK_COVER)}
          alt=""
          loading="lazy"
          className="comm-card__cover-img"
        />
        <div className="comm-card__cover-fade" aria-hidden />

        <div className="comm-card__cover-meta">
          {community.is_featured && (
            <span className="comm-card__pill comm-card__pill--featured">
              <TrendingUp className="h-3 w-3" aria-hidden />
              Featured
            </span>
          )}
          {community.role === 'admin' && (
            <span className="comm-card__pill comm-card__pill--admin">
              <Crown className="h-3 w-3" aria-hidden />
              Admin
            </span>
          )}
          <span
            className={[
              'comm-card__pill',
              community.is_private ? 'comm-card__pill--private' : 'comm-card__pill--public',
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
        <div className="comm-card__avatar-row">
          <div className="comm-card__avatar-wrap">
            <img
              src={mediaOrFallback(community.avatar_url, FALLBACK_AVATAR)}
              alt=""
              loading="lazy"
              className="comm-card__avatar"
            />
            {isRecentlyActive && (
              <span className="comm-card__active-ring" title="Active in the last 24 hours" />
            )}
          </div>
        </div>

        <div className="comm-card__content">
          <div className="comm-card__title-row">
            <h3 className="comm-card__title">{community.name}</h3>
            <span className="comm-card__view-link" aria-hidden>
              View
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>

          <p
            className={[
              'comm-card__description',
              !hasDescription ? 'comm-card__description--placeholder' : '',
            ].join(' ')}
          >
            {hasDescription ? community.description : 'Join the conversation in this community.'}
          </p>

          <div className="comm-card__stats-line">
            <span className="comm-card__stat-item">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {formatCountLabel(memberCount, 'member')}
            </span>
            {community.category ? (
              <>
                <span className="comm-card__stat-dot" aria-hidden />
                <span className="comm-card__category">{community.category}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="comm-card__footer">
          <button
            type="button"
            disabled={joinLoading}
            onClick={handleJoinClick}
            onMouseEnter={() => setHoverJoined(true)}
            onMouseLeave={() => setHoverJoined(false)}
            className={[
              'comm-card__cta',
              isJoined
                ? hoverJoined
                  ? 'comm-card__cta--leave'
                  : 'comm-card__cta--joined'
                : 'comm-card__cta--join',
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
            ) : (
              'Join'
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
