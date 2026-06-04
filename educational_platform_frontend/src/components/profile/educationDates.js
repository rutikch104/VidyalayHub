import {
  EXPERIENCE_MONTHS,
  getExperienceYearOptions,
} from '@/components/profile/experienceDates';

export const EDUCATION_MONTHS = EXPERIENCE_MONTHS;
export const getEducationYearOptions = getExperienceYearOptions;

const MIN_YEAR = 1950;

function monthYearKey(year, month) {
  return Number(year) * 12 + Number(month);
}

function formatMonthYear(month, year) {
  const m = EDUCATION_MONTHS.find((item) => item.value === Number(month));
  if (!m || !year) return '';
  return `${m.short} ${year}`;
}

export function formatEducationDuration(row = {}) {
  const startMonth = row.start_month != null ? Number(row.start_month) : null;
  const startYear = row.start_year != null ? Number(row.start_year) : null;
  const endMonth = row.end_month != null ? Number(row.end_month) : null;
  const endYear = row.end_year != null ? Number(row.end_year) : null;
  const isCurrent = !!row.is_current_studying;

  if (startMonth && startYear) {
    const start = formatMonthYear(startMonth, startYear);
    if (isCurrent) return `${start} – Present`;
    if (endMonth && endYear) {
      return `${start} – ${formatMonthYear(endMonth, endYear)}`;
    }
    return start;
  }
  return row.duration != null ? String(row.duration).trim() : '';
}

export function formatEducationGradeLine(row = {}) {
  const parts = [];
  const cgpa = row.cgpa != null ? String(row.cgpa).trim() : '';
  const pct = row.percentage != null ? String(row.percentage).trim() : '';
  if (cgpa) parts.push(`CGPA: ${cgpa}`);
  if (pct) {
    const p = pct.includes('%') ? pct : `${pct}%`;
    parts.push(`Grade: ${p}`);
  }
  return parts.length ? parts.join(' · ') : '';
}

export function formatDegreeFieldLine(row = {}) {
  const degree = row.degree ? String(row.degree).trim() : '';
  const field = row.field_of_study ? String(row.field_of_study).trim() : '';
  if (degree && field) return `${degree} · ${field}`;
  return degree || field || '';
}

export function emptyEducationDateForm() {
  return {
    start_month: '',
    start_year: '',
    end_month: '',
    end_year: '',
    is_current_studying: false,
  };
}

export function educationRowToDateForm(row = {}) {
  if (row.start_month && row.start_year) {
    return {
      start_month: String(row.start_month),
      start_year: String(row.start_year),
      end_month: row.is_current_studying ? '' : (row.end_month ? String(row.end_month) : ''),
      end_year: row.is_current_studying ? '' : (row.end_year ? String(row.end_year) : ''),
      is_current_studying: !!row.is_current_studying,
    };
  }
  return emptyEducationDateForm();
}

export function validateEducationDates(dates = {}) {
  const errors = {};
  const startMonth = dates.start_month ? parseInt(String(dates.start_month), 10) : NaN;
  const startYear = dates.start_year ? parseInt(String(dates.start_year), 10) : NaN;
  const endMonth = dates.end_month ? parseInt(String(dates.end_month), 10) : NaN;
  const endYear = dates.end_year ? parseInt(String(dates.end_year), 10) : NaN;
  const isCurrent = !!dates.is_current_studying;
  const maxYear = new Date().getFullYear() + 6;

  if (!dates.start_month) errors.start_month = 'Start month is required.';
  else if (Number.isNaN(startMonth) || startMonth < 1 || startMonth > 12) {
    errors.start_month = 'Select a valid start month.';
  }

  if (!dates.start_year) errors.start_year = 'Start year is required.';
  else if (Number.isNaN(startYear) || startYear < MIN_YEAR || startYear > maxYear) {
    errors.start_year = 'Select a valid start year.';
  }

  if (!isCurrent) {
    if (!dates.end_month) errors.end_month = 'End month is required.';
    else if (Number.isNaN(endMonth) || endMonth < 1 || endMonth > 12) {
      errors.end_month = 'Select a valid end month.';
    }
    if (!dates.end_year) errors.end_year = 'End year is required.';
    else if (Number.isNaN(endYear) || endYear < MIN_YEAR || endYear > maxYear) {
      errors.end_year = 'Select a valid end year.';
    }
    if (
      !errors.start_month
      && !errors.start_year
      && !errors.end_month
      && !errors.end_year
      && monthYearKey(endYear, endMonth) < monthYearKey(startYear, startMonth)
    ) {
      errors.end_date = 'End date cannot be earlier than start date.';
    }
  }

  const firstError = errors.start_month
    || errors.start_year
    || errors.end_month
    || errors.end_year
    || errors.end_date
    || null;

  return { valid: !firstError, errors, message: firstError };
}

export function buildEducationDatePayload(dates = {}) {
  const start_month = parseInt(String(dates.start_month), 10);
  const start_year = parseInt(String(dates.start_year), 10);
  const is_current_studying = !!dates.is_current_studying;
  const payload = {
    start_month,
    start_year,
    is_current_studying,
    end_month: null,
    end_year: null,
  };
  if (!is_current_studying) {
    payload.end_month = parseInt(String(dates.end_month), 10);
    payload.end_year = parseInt(String(dates.end_year), 10);
  }
  payload.duration = formatEducationDuration(payload);
  return payload;
}
