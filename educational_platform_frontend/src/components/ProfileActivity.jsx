// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/services/userService';
import { formatPostFromApi, formatFeedItemFromApi } from '@/services/postService';
import FeedPostCard from '@/components/posts/FeedPostCard';

export default function ProfileActivity({ onNavigate }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await userService.getUserPosts(user.id, { page: 1, limit: 100 });
      const raw = response.posts || [];
      setPosts(raw.map((p) => formatFeedItemFromApi(p)).filter(Boolean));
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId && p.original_post_id !== postId));
  };

  const handleAmplifyRemoved = (amplifyItem, res) => {
    setPosts((prev) => prev.filter((p) => p.id !== amplifyItem.id));
    if (res && !res.is_amplified && amplifyItem?.original_post_id) {
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === String(amplifyItem.original_post_id)
            ? { ...p, is_amplified: false, is_reposted: false, reposts_count: res.reposts_count ?? p.reposts_count }
            : p,
        ),
      );
    }
  };

  const handleAmplifyStateChange = (postId, res) => {
    if (res?.is_amplified || res?.is_reposted) return;
    setPosts((prev) =>
      prev
        .filter((p) => !(p.feed_type === 'amplify' && String(p.original_post_id) === String(postId)))
        .map((p) =>
          String(p.id) === String(postId)
            ? { ...p, is_amplified: false, is_reposted: false, reposts_count: res.reposts_count ?? p.reposts_count }
            : p,
        ),
    );
  };

  const handlePostEdited = (updated) => {
    if (!updated?.id) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(updated.id)) return p;
        const next = formatPostFromApi(updated);
        return next || p;
      }),
    );
  };

  const goBack = () => {
    if (onNavigate) onNavigate('profile');
  };

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Please log in to view your activity.</p>
      </div>
    );
  }

  return (
    <div className="platform-page">
      <div className="platform-page__container">
        <button
          type="button"
          onClick={goBack}
          className="mb-6 inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-muted/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Your activity</h1>
            <p className="text-sm text-muted-foreground">Posts, amplifies, and engagement in one place</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="loading-spinner h-10 w-10" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card py-16 text-center shadow-sm">
            <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-40" />
            <p className="font-semibold text-foreground">No posts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a post from the home feed to see it here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <FeedPostCard
                key={post.id}
                item={post}
                onPostDeleted={handlePostDeleted}
                onPostEdited={handlePostEdited}
                onAmplifyRemoved={handleAmplifyRemoved}
                onAmplifyStateChange={handleAmplifyStateChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
