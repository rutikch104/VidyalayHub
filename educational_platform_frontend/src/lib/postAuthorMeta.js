/** Resolve the author's college / institution label for feed cards. */
export function resolveAuthorCollegeName(postUser, post, currentUser) {
  const u = postUser || {};

  const fromUser = [
    u.college_name,
    u.tenant_name,
    u.tenant?.name,
    u.tenant?.short_name,
    u.institution?.name,
  ]
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .find(Boolean);

  if (fromUser) return fromUser;

  const fromPost = [
    post?.college_name,
    post?.tenant_name,
    post?.tenant?.name,
    post?.tenant?.short_name,
  ]
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .find(Boolean);

  if (fromPost) return fromPost;

  if (currentUser && u.id && String(currentUser.id) === String(u.id)) {
    const fromViewer = [
      currentUser.college_name,
      currentUser.tenant_name,
      currentUser.institution?.name,
    ]
      .map(v => (typeof v === 'string' ? v.trim() : ''))
      .find(Boolean);
    if (fromViewer) return fromViewer;
  }

  return null;
}
