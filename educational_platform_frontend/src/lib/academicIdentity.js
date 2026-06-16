const SEP = ' • ';

const GENERIC_TITLES = new Set(['student', 'teacher', 'alumni', 'staff', 'user', 'member']);

function joinParts(parts) {
  return parts
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join(SEP) || null;
}

function resolveUserType(user) {
  return String(user?.user_type || user?.role || user?.userType || '').toLowerCase();
}

function extractGraduationYear(user) {
  const year =
    user?.graduation_year ||
    user?.graduationYear ||
    user?.academicInfo?.graduationYear ||
    user?.academic_extra?.graduation_year;
  if (year) return Number(year);

  const batch =
    user?.academic_batch ||
    user?.academicBatch ||
    user?.graduation_batch ||
    user?.graduationBatch;
  if (batch) {
    const m = String(batch).match(/(\d{4})\s*[-–]\s*(\d{4})/);
    if (m) return Number(m[2]);
    const single = String(batch).match(/(\d{4})/);
    if (single) return Number(single[1]);
  }
  return null;
}

function formatAlumniBatch(user) {
  const explicit = user?.graduation_batch || user?.graduationBatch;
  if (explicit) return String(explicit).startsWith('Batch') ? explicit : `Batch ${explicit}`;

  const gradYear = extractGraduationYear(user);
  if (gradYear) return `Batch ${gradYear}`;
  return null;
}

function pickDegree(user) {
  return (
    user?.degree ||
    user?.department ||
    user?.academicInfo?.department ||
    null
  );
}

function pickBranch(user) {
  return (
    user?.branch ||
    user?.course ||
    user?.major ||
    user?.academicInfo?.course ||
    null
  );
}

function pickAcademicYear(user) {
  return (
    user?.academic_year ||
    user?.academicYear ||
    user?.student_year ||
    user?.studentYear ||
    user?.year ||
    user?.academicInfo?.studentYear ||
    null
  );
}

function pickDesignation(user) {
  return user?.designation || user?.position || user?.professionalInfo?.position || null;
}

function pickTeacherDepartment(user) {
  return (
    user?.teacher_department ||
    user?.teacherDepartment ||
    user?.company ||
    user?.professionalInfo?.company ||
    null
  );
}

function pickAlumniCompany(user) {
  return (
    user?.company ||
    user?.company_name ||
    user?.professionalInfo?.company ||
    null
  );
}

/** Standardized professional identity for alumni & teachers (tertiary line). */
export function formatProfessionalIdentity(user) {
  if (!user) return null;
  const type = resolveUserType(user);
  if (type === 'student') return null;

  if (type === 'alumni') {
    const position = pickDesignation(user);
    const company = pickAlumniCompany(user);
    if (position && company) return `${position} at ${company}`;
    if (position) return position;
    if (company) return company;
    return null;
  }

  if (type === 'teacher') {
    return (
      user?.tenant_name ||
      user?.college_name ||
      user?.university ||
      user?.academicInfo?.university ||
      null
    );
  }

  return null;
}

/** Prefer API-provided professional_identity; compute locally as fallback. */
export function resolveProfessionalIdentity(user) {
  if (!user) return null;

  const direct = user.professional_identity?.trim() || user.professionalIdentity?.trim();
  if (direct) return direct;

  return formatProfessionalIdentity(user);
}

export function resolveProfessionalIdentityFromProfile(profileData) {
  if (!profileData) return null;

  const fromApi = profileData.professional_identity || profileData.professionalIdentity;
  if (fromApi) return fromApi;

  const userType = profileData.userType || profileData.user_type;
  return formatProfessionalIdentity({
    user_type: userType,
    company: profileData.company || profileData.professionalInfo?.company,
    company_name: profileData.company,
    position: profileData.position || profileData.professionalInfo?.position,
    designation: profileData.professionalInfo?.position || profileData.position || profileData.designation,
    tenant_name: profileData.tenant_name,
    college_name: profileData.tenant_name,
    university: profileData.academicInfo?.university || profileData.tenant_name,
  });
}

/** Standardized academic identity string for any user-like object. */
export function formatAcademicIdentity(user) {
  if (!user) return null;
  const type = resolveUserType(user);

  if (type === 'student') {
    return joinParts([pickDegree(user), pickBranch(user), pickAcademicYear(user)]);
  }

  if (type === 'teacher') {
    return joinParts([pickDesignation(user), pickTeacherDepartment(user)]);
  }

  if (type === 'alumni') {
    return joinParts([pickDegree(user), pickBranch(user), formatAlumniBatch(user)]);
  }

  return null;
}

/** Prefer API-provided academic_identity; compute locally as fallback. */
export function resolveAcademicIdentity(user) {
  if (!user) return null;

  const direct = user.academic_identity?.trim() || user.academicIdentity?.trim();
  if (direct && !GENERIC_TITLES.has(direct.toLowerCase())) return direct;

  const headline = user.headline?.trim();
  if (headline && !GENERIC_TITLES.has(headline.toLowerCase())) {
    if (headline.includes('•') || headline.includes('·')) return headline;
  }

  return formatAcademicIdentity(user);
}

export function resolveAcademicIdentityFromProfile(profileData) {
  if (!profileData) return null;

  const fromApi = profileData.academic_identity || profileData.academicIdentity;
  if (fromApi && !GENERIC_TITLES.has(String(fromApi).trim().toLowerCase())) return fromApi;

  const userType = profileData.userType || profileData.user_type;
  return formatAcademicIdentity({
    user_type: userType,
    degree: profileData.degree || profileData.academicInfo?.department || profileData.department,
    branch: profileData.branch || profileData.academicInfo?.course || profileData.course,
    academic_year:
      profileData.academic_year ||
      profileData.academicInfo?.studentYear ||
      profileData.student_year,
    graduation_batch: profileData.graduation_batch || profileData.graduationBatch,
    graduation_year: profileData.academicInfo?.graduationYear || profileData.graduation_year,
    designation: profileData.professionalInfo?.position || profileData.position || profileData.designation,
    teacher_department:
      profileData.teacher_department ||
      profileData.professionalInfo?.company ||
      profileData.company,
    academic_batch: profileData.academic_batch,
  });
}
