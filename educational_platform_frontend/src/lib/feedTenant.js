import { getPortalAccess } from '@/lib/access';

/** Platform operators may view cross-tenant feed content. */
export function isPlatformFeedViewer(user) {
  if (!user) return false;
  if (getPortalAccess(user) === 'platform') return true;
  const role = String(user.role || '').toLowerCase();
  return Boolean(user.super_admin_owner || role === 'super_admin' || role === 'main_admin');
}

/**
 * Defense-in-depth: keep only posts from the viewer's college on the homepage feed.
 */
export function filterPostsForCollegeHome(posts, user) {
  if (!Array.isArray(posts) || !user) return posts || [];
  if (isPlatformFeedViewer(user)) return posts;

  const tid =
    user.tenant_id != null && String(user.tenant_id).trim() !== ''
      ? String(user.tenant_id).trim()
      : '';

  if (!tid) {
    return posts.filter((p) => String(p.user_id) === String(user.id));
  }

  return posts.filter((post) => {
    if (post.feed_type === 'amplify') {
      const amplifierTid =
        post.amplifier?.tenant_id != null && String(post.amplifier.tenant_id).trim() !== ''
          ? String(post.amplifier.tenant_id).trim()
          : '';
      if (amplifierTid && amplifierTid !== tid) return false;
      if (String(post.amplifier?.id) === String(user.id)) return true;

      const original = post.original_post || {};
      const vis = String(original.visibility || 'public').toLowerCase();
      if (vis === 'private' || vis === 'private_only') return false;

      const postTid =
        original.tenant_id != null && String(original.tenant_id).trim() !== ''
          ? String(original.tenant_id).trim()
          : '';
      const authorTid =
        original.user?.tenant_id != null && String(original.user.tenant_id).trim() !== ''
          ? String(original.user.tenant_id).trim()
          : '';

      if (postTid && postTid !== tid) return false;
      if (authorTid && authorTid !== tid) return false;
      return true;
    }

    if (String(post.user_id) === String(user.id)) return true;

    const postTid =
      post.tenant_id != null && String(post.tenant_id).trim() !== ''
        ? String(post.tenant_id).trim()
        : '';
    const authorTid =
      post.user?.tenant_id != null && String(post.user.tenant_id).trim() !== ''
        ? String(post.user.tenant_id).trim()
        : '';

    if (postTid && postTid !== tid) return false;
    if (authorTid && authorTid !== tid) return false;
    if (!postTid && !authorTid) return false;

    const vis = String(post.visibility || 'public').toLowerCase();
    if (vis === 'private' || vis === 'private_only') return false;

    return true;
  });
}
