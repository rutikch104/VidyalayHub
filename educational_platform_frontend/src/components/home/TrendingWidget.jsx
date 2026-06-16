import { ChevronRight, Hash, Loader2, TrendingUp } from 'lucide-react';
import TrendingHashtagCard from '@/components/home/TrendingHashtagCard';
import TrendingSkillCard from '@/components/home/TrendingSkillCard';
import {
  TRENDING_HASHTAG_DISPLAY_LIMIT,
  TRENDING_SKILL_DISPLAY_LIMIT,
} from '@/lib/trendingWidgetUtils';

function TrendingSkeleton() {
  return (
    <div className="trending-widget__skeleton" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="trending-widget__skeleton-row" />
      ))}
    </div>
  );
}

function TrendingEmptyState({ onExplore }) {
  return (
    <div className="trending-widget__empty">
      <div className="trending-widget__empty-icon">
        <Hash className="h-6 w-6" aria-hidden />
      </div>
      <p className="trending-widget__empty-title">No trends yet</p>
      <p className="trending-widget__empty-text">
        Post with hashtags to spark campus conversations and discover what&apos;s buzzing.
      </p>
      <button type="button" onClick={onExplore} className="trending-widget__empty-cta">
        Explore feed
      </button>
    </div>
  );
}

export default function TrendingWidget({
  hashtags = [],
  skills = [],
  loading = false,
  onHashtagClick,
  onSkillClick,
  onViewAll,
}) {
  const visibleHashtags = hashtags.slice(0, TRENDING_HASHTAG_DISPLAY_LIMIT);
  const visibleSkills = skills.slice(0, TRENDING_SKILL_DISPLAY_LIMIT);
  const maxCount = visibleHashtags.reduce((max, h) => Math.max(max, h.count || 0), 0);
  const showViewAll =
    hashtags.length > TRENDING_HASHTAG_DISPLAY_LIMIT ||
    hashtags.length >= TRENDING_HASHTAG_DISPLAY_LIMIT;

  if (loading) {
    return (
      <div className="trending-widget">
        <div className="flex items-center justify-center py-5">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" aria-label="Loading trends" />
        </div>
        <TrendingSkeleton />
      </div>
    );
  }

  if (visibleHashtags.length === 0 && visibleSkills.length === 0) {
    return <TrendingEmptyState onExplore={onViewAll} />;
  }

  return (
    <div className="trending-widget">
      {visibleHashtags.length > 0 ? (
        <div className="trending-widget__section">
          <p className="trending-widget__section-label">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            Campus hashtags
          </p>
          <div className="trending-widget__list">
            {visibleHashtags.map((hashtag, index) => (
              <TrendingHashtagCard
                key={hashtag.tag}
                hashtag={hashtag}
                rank={index}
                maxCount={maxCount}
                onClick={() => onHashtagClick?.(hashtag)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {visibleSkills.length > 0 ? (
        <div className="trending-widget__section trending-widget__section--skills">
          <p className="trending-widget__section-label trending-widget__section-label--skills">
            In-demand skills
          </p>
          <div className="trending-widget__list">
            {visibleSkills.map((skill, index) => (
              <TrendingSkillCard
                key={skill.skill}
                skill={skill}
                rank={index}
                onClick={() => onSkillClick?.(skill)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {showViewAll && visibleHashtags.length > 0 ? (
        <button type="button" onClick={onViewAll} className="trending-widget__view-all">
          Explore all trends
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
