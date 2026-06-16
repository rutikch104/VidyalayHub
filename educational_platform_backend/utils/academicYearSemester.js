/** Academic year → allowed semester numbers (API validation) */

const ACADEMIC_YEAR_OPTIONS = ['FY', 'SY', 'TY', 'Final Year'];

const YEAR_SEMESTER_MAP = {
  FY: ['1', '2'],
  SY: ['3', '4'],
  TY: ['5', '6'],
  'Final Year': ['7', '8'],
};

function normalizeAcademicYear(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (v === 'First Year' || v.toUpperCase() === 'FY') return 'FY';
  if (v === 'Second Year' || v.toUpperCase() === 'SY') return 'SY';
  if (v === 'Third Year' || v.toUpperCase() === 'TY') return 'TY';
  if (/final/i.test(v)) return 'Final Year';
  return ACADEMIC_YEAR_OPTIONS.includes(v) ? v : v;
}

function normalizeSemester(value) {
  if (value == null || String(value).trim() === '') return '';
  return String(value).replace(/^Semester\s+/i, '').trim();
}

function isValidYearSemesterPair(year, semester) {
  const key = normalizeAcademicYear(year);
  const sem = normalizeSemester(semester);
  if (!key || !sem) return true;
  return (YEAR_SEMESTER_MAP[key] || []).includes(sem);
}

function validateYearSemester(year, semester, { required = false } = {}) {
  const key = normalizeAcademicYear(year);
  const sem = normalizeSemester(semester);
  if (required && !key) return 'Current academic year is required.';
  if (required && !sem) return 'Current semester is required.';
  if (key && sem && !isValidYearSemesterPair(key, sem)) {
    const allowed = (YEAR_SEMESTER_MAP[key] || []).map((n) => `Semester ${n}`).join(' or ');
    return `Invalid semester for ${key}. Allowed: ${allowed}.`;
  }
  return null;
}

module.exports = {
  ACADEMIC_YEAR_OPTIONS,
  normalizeAcademicYear,
  normalizeSemester,
  isValidYearSemesterPair,
  validateYearSemester,
};
