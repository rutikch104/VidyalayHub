import { BookOpen, Heart, ChevronRight, PenLine } from 'lucide-react';
import ProfileCardShell from '@/components/profile/ProfileCardShell';

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse flex-col gap-2 border-b border-[#f3f4f6] py-3.5 last:border-0 dark:border-border/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-full max-w-md rounded bg-muted" />
        <div className="h-3 w-24 rounded bg-muted/70" />
      </div>
      <div className="flex gap-3">
        <div className="h-6 w-14 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted/70" />
      </div>
    </div>
  );
}

export default function ActivityPreviewSection({
  posts,
  loading,
  onViewAllActivity,
  onCreatePost,
  previewCount = 3,
}) {
  const rows = (posts || []).slice(0, previewCount);

  return (
    <ProfileCardShell id="profile-activity-preview" title="Recent activity" icon={BookOpen}>
      {loading ? (
        <div>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#e5e7eb] bg-[#f9fafb] px-6 py-10 text-center dark:border-border dark:bg-muted/20">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" />
          <p className="font-medium text-[#111827] dark:text-foreground">No activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Share an update on the home feed to build your timeline.</p>
          {onCreatePost ? (
            <button
              type="button"
              onClick={onCreatePost}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2563eb]"
            >
              <PenLine className="h-4 w-4" />
              Go to home & create a post
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="divide-y divide-[#f3f4f6] dark:divide-border/60">
            {rows.map((post) => {
              const title =
                (post.content || '').trim().replace(/\s+/g, ' ').slice(0, 88) || 'Shared an update';
              return (
                <div
                  key={post.id}
                  className="flex flex-col gap-2 py-3.5 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#111827] dark:text-foreground">{title}</p>
                    <p className="mt-1 text-[13px] text-[#9ca3af]">{timeAgo(post.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-md bg-[#f3f4f6] px-2.5 py-1 text-[12px] font-medium text-[#6b7280] dark:bg-muted">
                      post
                    </span>
                    <span className="flex items-center gap-1 text-[13px] text-[#9ca3af]">
                      <Heart className="h-3.5 w-3.5" />
                      {post.likes_count ?? 0} likes
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex justify-center border-t border-[#f3f4f6] pt-5 dark:border-border/60">
            <button
              type="button"
              onClick={onViewAllActivity}
              className="inline-flex items-center gap-2 rounded-full bg-[#3b82f6] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#2563eb] hover:shadow-md"
            >
              See all activity
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </ProfileCardShell>
  );
}
