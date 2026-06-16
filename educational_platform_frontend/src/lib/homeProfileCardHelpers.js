import { roleLabel } from '@/components/network/networkUtils';
import { resolveAcademicIdentity } from '@/lib/academicIdentity';

const GENERIC_TITLES = new Set(['student', 'teacher', 'alumni', 'staff', 'user', 'member']);

function isGenericTitle(value) {
  if (!value || typeof value !== 'string') return true;
  return GENERIC_TITLES.has(value.trim().toLowerCase());
}

/** LinkedIn-style location — preserve city, state when present */
export function formatProfileLocation(location) {
  const raw = typeof location === 'string' ? location.trim() : '';
  if (!raw) return null;
  return raw.replace(/\s+/g, ' ');
}

export function resolveUserRole(userType, fallbackRole) {
  const role = (userType || fallbackRole || 'member').toLowerCase();
  return role;
}

export function buildProfileHeadline({
  headline,
  title,
  position,
  course,
  department,
  company,
  bio,
  userType,
} = {}) {
  const customHeadline = headline?.trim();
  if (customHeadline && !isGenericTitle(customHeadline)) return customHeadline;

  const customTitle = title?.trim();
  if (customTitle && !isGenericTitle(customTitle)) return customTitle;

  const bioSnippet = bio?.trim();
  if (bioSnippet) {
    const firstLine = bioSnippet.split(/\n/)[0]?.trim();
    const short = (firstLine?.length <= 72 ? firstLine : firstLine?.slice(0, 69).trim() + '…');
    if (short) return short;
  }

  const pos = position?.trim();
  const dept = department?.trim();
  const crs = course?.trim();
  const org = company?.trim();
  const role = resolveUserRole(userType);

  if (pos && dept) return `${pos}, ${dept}`;
  if (pos && org) return `${pos} at ${org}`;
  if (pos) return pos;
  if (crs && dept) return `${crs} · ${dept}`;
  if (crs) return crs;
  if (dept && role === 'student') return `${dept} Student`;
  if (dept && role === 'teacher') return `${dept} Faculty`;
  if (dept) return dept;
  if (org) return org;

  return roleLabel(role);
}

export function buildInstitutionLine({
  tenantName,
  university,
  collegeName,
} = {}) {
  return (
    tenantName?.trim() ||
    university?.trim() ||
    collegeName?.trim() ||
    null
  );
}

export function buildDepartmentLine({ department, course, userType } = {}) {
  const dept = department?.trim();
  const crs = course?.trim();
  const role = resolveUserRole(userType);

  if (dept && crs && dept !== crs) return `${crs} · ${dept}`;
  if (dept && role !== 'student') return dept;
  return null;
}

export function normalizeSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((s) => (typeof s === 'string' ? s : s?.name || s?.skill_name || ''))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function mergeProfileCardData({ user, profile, summary } = {}) {
  const userType = resolveUserRole(user?.user_type, user?.role);
  const location =
    formatProfileLocation(summary?.location) ||
    formatProfileLocation(profile?.location) ||
    formatProfileLocation(user?.location);

  const institution = buildInstitutionLine({
    tenantName: user?.tenant_name || user?.institution?.name || profile?.tenant_name,
    university: profile?.university,
    collegeName: profile?.college_name,
  });

  const headline = buildProfileHeadline({
    headline: profile?.academic_identity || profile?.headline,
    title: user?.title || profile?.title,
    position: profile?.position,
    course: profile?.course,
    department: profile?.department,
    company: profile?.company || institution,
    userType,
  }) || resolveAcademicIdentity({ ...profile, user_type: userType });

  const departmentLine = buildDepartmentLine({
    department: profile?.department,
    course: profile?.course,
    userType,
  });

  return {
    name: user?.name || profile?.name || 'User',
    userType,
    roleLabel: roleLabel(userType),
    headline,
    institution,
    departmentLine,
    location,
    isVerified: Boolean(profile?.is_verified),
    isPremium: Boolean(profile?.is_premium),
  };
}

export function normalizeSuggestionPerson(raw, avatarResolver) {
  const name =
    raw.full_name ||
    [raw.first_name, raw.last_name].filter(Boolean).join(' ').trim() ||
    'Member';
  const userType = resolveUserRole(raw.user_type);
  const institution = buildInstitutionLine({ collegeName: raw.college_name });
  const academic_identity =
    raw.academic_identity?.trim() || resolveAcademicIdentity(raw) || null;
  const professional_identity = raw.professional_identity?.trim() || null;

  return {
    id: String(raw.id || raw.user_id),
    name,
    avatar: avatarResolver?.(raw.profile_picture || raw.avatar_url || raw.avatar)
      || raw.profile_picture
      || raw.avatar_url
      || raw.avatar,
    userType,
    role: userType,
    roleLabel: roleLabel(userType),
    academic_identity,
    professional_identity,
    headline:
      academic_identity
      || buildProfileHeadline({
        headline: raw.headline,
        bio: raw.bio,
        department: raw.department,
        course: raw.branch || raw.course,
        company: raw.company,
        position: raw.position,
        userType,
      }),
    company: raw.company?.trim() || null,
    position: raw.position?.trim() || null,
    college: institution,
    institution,
    location: formatProfileLocation(raw.location),
    mutualConnections: raw.mutual_connections ?? 0,
    suggestionReasons: raw.suggestion_reasons || [],
  };
}
