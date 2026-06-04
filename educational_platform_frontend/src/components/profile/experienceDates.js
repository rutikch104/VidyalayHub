export const EXPERIENCE_MONTHS = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
];

const MIN_YEAR = 1950;

export function getExperienceYearOptions() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current + 1; y >= MIN_YEAR; y -= 1) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

function monthYearKey(year, month) {
  return Number(year) * 12 + Number(month);
}

function formatMonthYear(month, year) {
  const m = EXPERIENCE_MONTHS.find((item) => item.value === Number(month));
  if (!m || !year) return '';
  return `${m.short} ${year}`;
}

export function formatExperienceDuration(row = {}) {
  const startMonth = row.start_month != null ? Number(row.start_month) : null;
  const startYear = row.start_year != null ? Number(row.start_year) : null;
  const endMonth = row.end_month != null ? Number(row.end_month) : null;
  const endYear = row.end_year != null ? Number(row.end_year) : null;
  const isCurrent = !!row.is_current_role;

  if (startMonth && startYear) {
    const start = formatMonthYear(startMonth, startYear);
    if (isCurrent) return `${start} – Present`;
    if (endMonth && endYear) {
      return `${start} – ${formatMonthYear(endMonth, endYear)}`;
    }
    return start;
  }

  const legacy = row.duration != null ? String(row.duration).trim() : '';
  return legacy || '';
}

export function emptyExperienceDateForm() {
  return {
    start_month: '',
    start_year: '',
    end_month: '',
    end_year: '',
    is_current_role: false,
  };
}

export function experienceRowToDateForm(row = {}) {
  if (row.start_month && row.start_year) {
    return {
      start_month: String(row.start_month),
      start_year: String(row.start_year),
      end_month: row.is_current_role ? '' : (row.end_month ? String(row.end_month) : ''),
      end_year: row.is_current_role ? '' : (row.end_year ? String(row.end_year) : ''),
      is_current_role: !!row.is_current_role,
    };
  }
  return emptyExperienceDateForm();
}

export function validateExperienceDates(dates = {}) {
  const errors = {};
  const startMonth = dates.start_month ? parseInt(String(dates.start_month), 10) : NaN;
  const startYear = dates.start_year ? parseInt(String(dates.start_year), 10) : NaN;
  const endMonth = dates.end_month ? parseInt(String(dates.end_month), 10) : NaN;
  const endYear = dates.end_year ? parseInt(String(dates.end_year), 10) : NaN;
  const isCurrent = !!dates.is_current_role;
  const maxYear = new Date().getFullYear() + 1;

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

export function buildExperienceDatePayload(dates = {}) {
  const start_month = parseInt(String(dates.start_month), 10);
  const start_year = parseInt(String(dates.start_year), 10);
  const is_current_role = !!dates.is_current_role;

  const payload = {
    start_month,
    start_year,
    is_current_role,
    end_month: null,
    end_year: null,
  };

  if (!is_current_role) {
    payload.end_month = parseInt(String(dates.end_month), 10);
    payload.end_year = parseInt(String(dates.end_year), 10);
  }

  payload.duration = formatExperienceDuration(payload);
  return payload;
}
