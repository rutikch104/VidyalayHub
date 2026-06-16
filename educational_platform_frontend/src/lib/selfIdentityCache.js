import { resolveAcademicIdentity, resolveProfessionalIdentity } from '@/lib/academicIdentity';

let cachedSelfProfile = null;
let cachedSelfUserId = null;

export function setSelfProfileCache(profile) {
  cachedSelfProfile = profile && typeof profile === 'object' ? profile : null;
  cachedSelfUserId = cachedSelfProfile?.id != null ? String(cachedSelfProfile.id) : null;
}

export function getSelfProfileCache() {
  return cachedSelfProfile;
}

export function enrichSelfAuthor(user, currentUserId) {
  if (!user?.id || !currentUserId) return user;
  if (String(user.id) !== String(currentUserId)) return user;
  if (user.academic_identity) return user;

  const profile = cachedSelfProfile;
  if (!profile) return user;

  const academic_identity = resolveAcademicIdentity({
    ...profile,
    user_type: profile.user_type || profile.userType,
  });
  const professional_identity = resolveProfessionalIdentity({
    ...profile,
    user_type: profile.user_type || profile.userType,
  });

  if (!academic_identity && !professional_identity) return user;

  return {
    ...user,
    ...(academic_identity ? { academic_identity } : {}),
    ...(professional_identity ? { professional_identity } : {}),
    user_type: user.user_type || profile.user_type || profile.userType,
    degree: user.degree || profile.degree || profile.department,
    branch: user.branch || profile.branch || profile.course,
    academic_year: user.academic_year || profile.academic_year || profile.student_year,
    graduation_batch: user.graduation_batch || profile.graduation_batch,
    designation: user.designation || profile.designation || profile.position,
    teacher_department: user.teacher_department || profile.teacher_department || profile.company,
    company: user.company || profile.company,
    position: user.position || profile.position,
    tenant_name: user.tenant_name || profile.tenant_name,
  };
}

export function enrichPostAuthorIfSelf(post, currentUserId) {
  if (!post?.user || !currentUserId) return post;
  return {
    ...post,
    user: enrichSelfAuthor(post.user, currentUserId),
  };
}

export function enrichSelfAuthorInPost(post) {
  if (!cachedSelfUserId) return post;
  return enrichPostAuthorIfSelf(post, cachedSelfUserId);
}

export function profileToIdentityFields(profile) {
  if (!profile) return null;
  return formatAcademicIdentity({
    ...profile,
    user_type: profile.user_type || profile.userType,
  });
}
