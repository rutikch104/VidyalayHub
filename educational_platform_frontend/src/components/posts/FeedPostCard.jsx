import PostCard from '@/components/PostCard';
import AmplifiedPostCard from '@/components/posts/AmplifiedPostCard';
import { formatFeedItemFromApi } from '@/services/postService';

export default function FeedPostCard({
  item,
  onPostDeleted,
  onPostEdited,
  onNavigate,
  onAmplifyRemoved,
  onAmplifyStateChange,
}) {
  const feedItem = formatFeedItemFromApi(item);
  if (!feedItem) return null;

  if (feedItem.feed_type === 'amplify') {
    return (
      <AmplifiedPostCard
        item={feedItem}
        onPostDeleted={onPostDeleted}
        onPostEdited={onPostEdited}
        onNavigate={onNavigate}
        onAmplifyRemoved={onAmplifyRemoved}
      />
    );
  }

  return (
    <PostCard
      post={feedItem}
      onPostDeleted={onPostDeleted}
      onPostEdited={onPostEdited}
      onNavigate={onNavigate}
      onAmplified={(res) => onAmplifyStateChange?.(feedItem.id, res)}
    />
  );
}
