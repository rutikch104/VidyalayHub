/** Academic year → allowed semester numbers (shared rules for UI + API validation) */

import { suggestStudentBatches } from '@/lib/academicBatch';

export const ACADEMIC_YEAR_OPTIONS = ['FY', 'SY', 'TY', 'Final Year'];

const YEAR_SEMESTER_MAP = {
  FY: ['1', '2'],
  SY: ['3', '4'],
  TY: ['5', '6'],
  'Final Year': ['7', '8'],
};

export function normalizeAcademicYear(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (v === 'First Year' || v.toUpperCase() === 'FY') return 'FY';
  if (v === 'Second Year' || v.toUpperCase() === 'SY') return 'SY';
  if (v === 'Third Year' || v.toUpperCase() === 'TY') return 'TY';
  if (/final/i.test(v)) return 'Final Year';
  return ACADEMIC_YEAR_OPTIONS.includes(v) ? v : v;
}

export function semestersForAcademicYear(year) {
  const key = normalizeAcademicYear(year);
  return YEAR_SEMESTER_MAP[key] || [];
}

export function semesterLabel(num) {
  return `Semester ${num}`;
}

export function isValidYearSemesterPair(year, semester) {
  const key = normalizeAcademicYear(year);
  if (!key || semester == null || String(semester).trim() === '') return true;
  const allowed = semestersForAcademicYear(key);
  const sem = String(semester).replace(/^Semester\s+/i, '').trim();
  return allowed.includes(sem);
}

export function validateYearSemester(year, semester, { required = false } = {}) {
  const key = normalizeAcademicYear(year);
  if (required && !key) return 'Current academic year is required.';
  if (required && (!semester || String(semester).trim() === '')) return 'Current semester is required.';
  if (key && semester && !isValidYearSemesterPair(key, semester)) {
    const allowed = semestersForAcademicYear(key).map(semesterLabel).join(' or ');
    return `For ${key}, only ${allowed} are valid.`;
  }
  return null;
}

export function normalizeSemester(value) {
  if (value == null || String(value).trim() === '') return '';
  return String(value).replace(/^Semester\s+/i, '').trim();
}

/** @deprecated Use suggestStudentBatches from academicBatch.js */
export function suggestAcademicBatches() {
  return suggestStudentBatches(new Date().getFullYear());
}
