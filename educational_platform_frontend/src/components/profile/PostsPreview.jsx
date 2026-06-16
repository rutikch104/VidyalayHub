import { FileText, ChevronRight } from 'lucide-react';
import FeedPostCard from '@/components/posts/FeedPostCard';
import { pp } from '@/components/profile/premium/profileTokens';
import { EduSectionCard } from '@/components/profile/eduConnect/primitives';
import ProfileEmptyState from '@/components/profile/premium/ProfileEmptyState';

const DEFAULT_PREVIEW_COUNT = 3;

function SkeletonPost() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="premium-profile__skeleton-shimmer h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="premium-profile__skeleton-shimmer h-3.5 w-36 rounded-md" />
          <div className="premium-profile__skeleton-shimmer h-3 w-24 rounded-md" />
        </div>
      </div>
      <div className="space-y-2 px-4 pb-3">
        <div className="premium-profile__skeleton-shimmer h-3 w-full rounded-md" />
        <div className="premium-profile__skeleton-shimmer h-3 w-4/5 rounded-md" />
      </div>
      <div className="premium-profile__skeleton-shimmer mx-4 mb-4 h-40 rounded-xl" />
    </div>
  );
}

export default function PostsPreview({
  posts,
  loading,
  onViewAllPosts,
  onPostDeleted,
  onPostEdited,
  onNavigate,
  maxPosts = DEFAULT_PREVIEW_COUNT,
  hideViewAll = false,
  subtitle = 'Posts, amplifies, and updates',
  emptyHint = 'Create a post from the home feed.',
}) {
  const list = (posts || []).filter(Boolean);
  const preview = maxPosts == null ? list : list.slice(0, maxPosts);

  return (
    <section id="profile-posts-preview" className="scroll-mt-28">
      <EduSectionCard icon={FileText} title="Activity" subtitle={subtitle}>
        {loading ? (
          <div className="space-y-4">
            <SkeletonPost />
            <SkeletonPost />
          </div>
        ) : preview.length === 0 ? (
          <ProfileEmptyState icon={FileText} title="No posts yet" description={emptyHint} />
        ) : (
          <>
            <div className="space-y-4">
              {preview.map((post, idx) => (
                <div
                  key={post?.id != null ? String(post.id) : `post-${idx}`}
                  className={pp.feedItem}
                  style={{ animationDelay: `${Math.min(idx, 5) * 40}ms` }}
                >
                  <FeedPostCard
                    item={post}
                    onPostDeleted={onPostDeleted}
                    onPostEdited={onPostEdited}
                    onNavigate={onNavigate}
                  />
                </div>
              ))}
            </div>
            {!hideViewAll && onViewAllPosts ? (
              <div className="mt-6 flex justify-center border-t border-border/40 pt-6">
                <button type="button" onClick={() => onViewAllPosts?.()} className={pp.btnPrimary}>
                  View all posts
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </>
        )}
      </EduSectionCard>
    </section>
  );
}
