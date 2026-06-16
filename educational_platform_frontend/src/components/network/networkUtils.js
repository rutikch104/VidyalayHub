export const NETWORK_TABS = [
  { key: 'connections', label: 'My connections' },
  { key: 'pending', label: 'Invitations' },
  { key: 'sent', label: 'Sent' },
  { key: 'discover', label: 'Discover' },
  { key: 'suggestions', label: 'Suggested' },
  { key: 'following', label: 'Following' },
];

export const ROLE_FILTERS = [
  { value: 'all', label: 'All roles' },
  { value: 'student', label: 'Students' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'staff', label: 'Staff' },
];

export const DISCOVER_PAGE_SIZE = 30;

export const DISCOVER_ADVANCED_FILTERS = [
  { key: 'degree', label: 'Degree', placeholder: 'e.g. B.Tech' },
  { key: 'branch', label: 'Branch', placeholder: 'e.g. Computer Engineering' },
  { key: 'department', label: 'Department', placeholder: 'e.g. CSE' },
  { key: 'academic_year', label: 'Academic year', placeholder: 'e.g. 3rd Year' },
  { key: 'batch', label: 'Batch', placeholder: 'e.g. 2022 Batch' },
  { key: 'company', label: 'Company', placeholder: 'e.g. TCS' },
  { key: 'designation', label: 'Designation', placeholder: 'e.g. Software Engineer' },
  { key: 'college', label: 'College', placeholder: 'e.g. RCPIT' },
];

export function roleLabel(userType) {
  switch (userType) {
    case 'student':
      return 'Student';
    case 'teacher':
      return 'Teacher';
    case 'alumni':
      return 'Alumni';
    case 'staff':
      return 'Staff';
    default:
      return 'Member';
  }
}

export function roleBadgeClass(userType) {
  switch (userType) {
    case 'student':
      return 'bg-sky-500/10 text-sky-700 border-sky-500/20';
    case 'alumni':
      return 'bg-violet-500/10 text-violet-700 border-violet-500/20';
    case 'teacher':
      return 'bg-amber-500/10 text-amber-800 border-amber-500/20';
    case 'staff':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

function resolvePeerUser(raw, options = {}) {
  if (options.connectionDirection === 'outgoing' && raw.receiver) {
    return raw.receiver;
  }
  if (options.connectionDirection === 'incoming' && raw.sender) {
    return raw.sender;
  }
  return raw.sender || raw.receiver || raw;
}

export function normalizePerson(raw, options = {}) {
  const user = resolvePeerUser(raw, options);
  const userPk = String(user?.id || raw.id || '');
  const id = userPk;
  const fullName =
    raw.full_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'User';

  return {
    id: options.connectionRowId ? String(options.connectionRowId) : userPk,
    userId: userPk,
    connectionId: raw.connection_id || options.connectionId || null,
    name: fullName,
    title: (raw.academic_identity && raw.academic_identity !== roleLabel(user?.user_type || raw.user_type))
      ? raw.academic_identity
      : (raw.headline && raw.headline !== roleLabel(user?.user_type || raw.user_type))
        ? raw.headline
        : roleLabel(user?.user_type || raw.user_type),
    academic_identity: raw.academic_identity || null,
    professional_identity: raw.professional_identity || null,
    company: raw.company || null,
    position: raw.position || null,
    branch: raw.branch || null,
    degree: raw.degree || null,
    role: user?.user_type || raw.user_type,
    college: raw.college_name || null,
    location: raw.location || user?.location || null,
    bio: raw.bio || user?.bio || null,
    avatar: user?.profile_picture || raw.profile_picture || null,
    mutualConnections: raw.mutual_connections ?? 0,
    mutualFollowers: raw.mutual_followers ?? 0,
    sharedSkillsCount: raw.shared_skills_count ?? 0,
    sharedCommunitiesCount: raw.shared_communities_count ?? 0,
    suggestionScore: raw.suggestion_score ?? null,
    suggestionReasons: raw.suggestion_reasons || [],
    presence: raw.presence_status || 'offline',
    isFollowing: Boolean(raw.is_following),
    connectionStatus: raw.connection_status || options.connectionStatus || null,
    connectionDirection:
      options.connectionDirection ||
      raw.connection_direction ||
      (raw.direction === 'inbound'
        ? 'incoming'
        : raw.direction === 'outbound'
          ? 'outgoing'
          : raw.direction) ||
      null,
    skills: raw.skills || [],
    isVerified: Boolean(raw.is_verified || user?.is_verified),
    message: raw.message || null,
    requestDate: raw.requested_at || raw.created_at || null,
    connectedAt: raw.responded_at || null,
  };
}

export const EMPTY_COPY = {
  connections: {
    title: 'Grow your professional network',
    body: 'Connect with alumni, teachers, and peers across colleges to unlock opportunities.',
  },
  pending: {
    title: 'No pending invitations',
    body: 'When someone invites you to connect, it will appear here.',
  },
  sent: {
    title: 'No sent requests',
    body: 'Requests you send will show up here until they respond.',
  },
  discover: {
    title: 'No people match your search',
    body: 'Try different keywords or clear filters to browse the full campus directory.',
  },
  suggestions: {
    title: 'No suggestions right now',
    body: 'Check back soon — we surface people based on mutual connections and shared interests.',
  },
  following: {
    title: 'Not following anyone yet',
    body: 'Follow professionals and peers to stay updated without connecting.',
  },
};
