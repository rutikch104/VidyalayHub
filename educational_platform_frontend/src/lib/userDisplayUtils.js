export function userDisplayName(user) {
  if (!user) return 'Guest';
  const composed = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (composed) return composed;
  if (user.name?.trim()) return user.name.trim();
  return user.email?.split('@')[0] || 'User';
}

export function userInitials(user) {
  const name = userDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function userRoleLabel(user) {
  const raw = user?.title || user?.user_type || user?.role || '';
  if (!raw) return 'Member';
  return String(raw)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
