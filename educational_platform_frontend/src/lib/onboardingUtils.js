export const DEGREE_OPTIONS = [
  'B.Tech', 'BCA', 'MCA', 'MBA', 'B.Sc', 'M.Sc', 'B.Com', 'M.Com', 'BBA', 'Ph.D', 'Other',
];

export const BRANCH_OPTIONS = [
  'Computer Engineering',
  'Information Technology',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Electronics & Communication',
  'AI & Data Science',
  'Other',
];

export const YEAR_OPTIONS = ['FY', 'SY', 'TY', 'Final Year'];

export const SEMESTER_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export function splitFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

export function shouldShowOnboarding(profile, user) {
  if (!profile || !user) return false;
  if (user.user_type === 'staff') return false;
  if (profile.onboarding_completed) return false;
  return ['student', 'teacher', 'alumni'].includes(user.user_type);
}

export function onboardingProgressPercent(stepIndex, totalSteps = 4) {
  if (totalSteps <= 1) return 100;
  return Math.min(100, Math.round(((stepIndex + 1) / totalSteps) * 100));
}

export function parseSkillsInput(value) {
  return String(value || '')
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function onboardingExperienceValue(profile) {
  const raw = String(profile?.experience || '').trim();
  if (!raw) return '';
  if (raw.includes(' · ') && raw.includes(' @ ')) return '';
  if (raw.length > 80) return '';
  return raw;
}

export function profileToFormState(profile) {
  const extra = profile?.academic_extra || {};
  let graduationYear = extra.graduation_year || '';
  if (!graduationYear && profile?.passout_year) {
    graduationYear = String(profile.passout_year);
  }
  return {
    bio: profile?.bio || '',
    location: profile?.location || '',
    phone_number: profile?.phone || '',
    linkedin_url: profile?.linkedin_url || '',
    github_url: profile?.github_url || '',
    website_url: profile?.website_url || '',
    degree: profile?.department || '',
    branch: profile?.course || '',
    year: profile?.student_year || (profile?.enrollment_year ? String(profile.enrollment_year) : ''),
    semester: profile?.current_semester ? String(profile.current_semester) : '',
    graduation_year: graduationYear,
    roll_number: extra.roll_number || '',
    university_name: extra.university_name || profile?.university || profile?.tenant_name || '',
    student_id: extra.student_id || '',
    cgpa: extra.cgpa || '',
    percentage: extra.percentage || '',
    admission_year: extra.admission_year || '',
    company: profile?.company || '',
    position: profile?.position || '',
    industry: extra.industry || '',
    experience: onboardingExperienceValue(profile),
    department: profile?.company || '',
    designation: profile?.position || '',
    qualification: extra.qualification || '',
    employee_id: extra.employee_id || '',
    faculty_id: extra.faculty_id || '',
    joining_date: extra.joining_date || '',
    teaching_experience: extra.teaching_experience || '',
    research_areas: extra.research_areas || '',
    skillsText: (profile?.skills || []).join(', '),
  };
}
