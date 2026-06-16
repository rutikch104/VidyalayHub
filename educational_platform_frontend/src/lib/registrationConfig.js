import {
  BRANCH_OPTIONS,
  DEGREE_OPTIONS,
} from '@/lib/onboardingUtils';
import {
  ACADEMIC_YEAR_OPTIONS,
  normalizeSemester,
} from '@/lib/academicYearSemester';
import { formatAcademicBatch } from '@/lib/academicBatch';

export const REGISTRATION_STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
  needs_info: 'Additional Info Required',
};

export function buildRegistrationFormData(form, userType) {
  const firstName = (form.first_name || '').trim();
  const lastName = (form.last_name || '').trim();
  const fullName = (form.full_name || `${firstName} ${lastName}`).trim();
  const fd = new FormData();

  fd.append('user_type', userType);
  fd.append('first_name', firstName);
  fd.append('last_name', lastName);
  fd.append('full_name', fullName);
  fd.append('email', form.email);
  fd.append('password', form.password);
  fd.append('password_confirm', form.password_confirm);
  fd.append('phone_number', form.phone_number || '');
  fd.append('tenant_id', form.tenant_id);
  fd.append('college_email', form.college_email || '');

  if (userType === 'student') {
    fd.append('student_id', form.student_id || '');
    fd.append('college_id', form.college_id || '');
    fd.append('roll_number', form.roll_number || '');
    fd.append('division', form.division || '');
    fd.append('university_reg_number', form.university_reg_number || '');
    fd.append('degree', form.degree || '');
    fd.append('branch', form.branch || '');
    fd.append('academic_batch', form.academic_batch || '');
    fd.append('year', form.year || '');
    fd.append('semester', normalizeSemester(form.semester) || '');
    fd.append('admission_year', form.admission_year || '');
    fd.append('expected_graduation_year', form.expected_graduation_year || '');
  }

  if (userType === 'alumni') {
    const batch = formatAcademicBatch(form.admission_year, form.graduation_year);
    fd.append('roll_number', form.roll_number || '');
    fd.append('alumni_id', form.alumni_id || '');
    fd.append('student_id', form.student_id || '');
    fd.append('college_id', form.college_id || '');
    fd.append('university_reg_number', form.university_reg_number || '');
    fd.append('degree', form.degree || '');
    fd.append('branch', form.branch || '');
    fd.append('academic_batch', batch);
    fd.append('admission_year', form.admission_year || '');
    fd.append('graduation_year', form.graduation_year || '');
  }

  if (userType === 'teacher') {
    fd.append('employee_id', form.employee_id || '');
    fd.append('faculty_id', form.faculty_id || '');
    fd.append('department', form.department || '');
    fd.append('designation', form.designation || '');
    fd.append('joining_date', form.joining_date || '');
    fd.append('qualification', form.qualification || '');
    fd.append('specialization', form.specialization || '');
  }

  if (form.profile_photo instanceof File) fd.append('profile_photo', form.profile_photo);
  if (form.id_card instanceof File) fd.append('id_card', form.id_card);
  if (form.admission_letter instanceof File) fd.append('admission_letter', form.admission_letter);
  if (form.graduation_certificate instanceof File) fd.append('graduation_certificate', form.graduation_certificate);

  return fd;
}

export function registrationStepsFor(userType) {
  if (userType === 'teacher') {
    return ['Personal', 'Institution', 'Verification', 'Review'];
  }
  if (userType === 'alumni') {
    return ['Personal', 'Academic', 'Verification', 'Review'];
  }
  return ['Personal', 'Academic', 'Verification', 'Review'];
}

export { DEGREE_OPTIONS, BRANCH_OPTIONS, ACADEMIC_YEAR_OPTIONS as YEAR_OPTIONS };
