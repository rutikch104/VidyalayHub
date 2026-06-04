const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MIN_YEAR = 1950;

class ExperienceServiceError extends Error {
  constructor(message, status = 400, code = 'EXPERIENCE_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function currentYear() {
  return new Date().getFullYear();
}

function parseIntField(value, fieldName, { min, max, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ExperienceServiceError(`${fieldName} is required.`);
    return null;
  }
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n)) {
    throw new ExperienceServiceError(`${fieldName} must be a valid number.`);
  }
  if (min != null && n < min) {
    throw new ExperienceServiceError(`${fieldName} is invalid.`);
  }
  if (max != null && n > max) {
    throw new ExperienceServiceError(`${fieldName} is invalid.`);
  }
  return n;
}

function monthYearKey(year, month) {
  return year * 12 + month;
}

function formatMonthYear(month, year) {
  if (!month || !year) return '';
  const idx = month - 1;
  if (idx < 0 || idx > 11) return '';
  return `${MONTH_SHORT[idx]} ${year}`;
}

function formatExperienceDuration(row = {}) {
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
  return legacy || null;
}

function hasStructuredDatesInRequest(body = {}) {
  return (
    body.start_month !== undefined
    || body.start_year !== undefined
    || body.end_month !== undefined
    || body.end_year !== undefined
    || body.is_current_role !== undefined
  );
}

function rowHasStructuredDates(row = {}) {
  return !!(row.start_month && row.start_year);
}

function normalizeExperiencePayload(body = {}) {
  const title = String(body.title || '').trim();
  if (!title) {
    throw new ExperienceServiceError('title is required.');
  }

  const company = body.company != null ? String(body.company).trim() || null : null;
  const description = body.description != null ? String(body.description).trim() || null : null;
  const sort_order = body.sort_order != null ? parseInt(String(body.sort_order), 10) || 0 : 0;

  if (!hasStructuredDatesInRequest(body) && !rowHasStructuredDates(body)) {
    const duration = body.duration != null ? String(body.duration).trim() || null : null;
    return {
      title,
      company,
      description,
      sort_order,
      duration,
      start_month: null,
      start_year: null,
      end_month: null,
      end_year: null,
      is_current_role: false,
    };
  }

  const start_month = parseIntField(body.start_month, 'Start month', { min: 1, max: 12, required: true });
  const start_year = parseIntField(body.start_year, 'Start year', {
    min: MIN_YEAR,
    max: currentYear() + 1,
    required: true,
  });
  const is_current_role = body.is_current_role === true
    || body.is_current_role === 'true'
    || body.is_current_role === 1
    || body.is_current_role === '1';

  let end_month = null;
  let end_year = null;

  if (!is_current_role) {
    end_month = parseIntField(body.end_month, 'End month', { min: 1, max: 12, required: true });
    end_year = parseIntField(body.end_year, 'End year', {
      min: MIN_YEAR,
      max: currentYear() + 1,
      required: true,
    });

    if (monthYearKey(end_year, end_month) < monthYearKey(start_year, start_month)) {
      throw new ExperienceServiceError('End date cannot be earlier than start date.');
    }
  }

  const duration = formatExperienceDuration({
    start_month,
    start_year,
    end_month,
    end_year,
    is_current_role,
  });

  return {
    title,
    company,
    description,
    sort_order,
    start_month,
    start_year,
    end_month,
    end_year,
    is_current_role,
    duration,
  };
}

function mapExperienceForApi(row) {
  const plain = row && typeof row.get === 'function' ? row.get({ plain: true }) : row || {};
  const duration = formatExperienceDuration(plain) || plain.duration || null;
  return {
    id: String(plain.id),
    title: plain.title,
    company: plain.company || null,
    description: plain.description || null,
    start_month: plain.start_month ?? null,
    start_year: plain.start_year ?? null,
    end_month: plain.end_month ?? null,
    end_year: plain.end_year ?? null,
    is_current_role: !!plain.is_current_role,
    duration,
  };
}

function compareExperienceRows(a, b) {
  const aKey = a.start_year && a.start_month
    ? monthYearKey(Number(a.start_year), Number(a.start_month))
    : 0;
  const bKey = b.start_year && b.start_month
    ? monthYearKey(Number(b.start_year), Number(b.start_month))
    : 0;
  if (bKey !== aKey) return bKey - aKey;
  return (Number(b.sort_order) || 0) - (Number(a.sort_order) || 0);
}

module.exports = {
  ExperienceServiceError,
  formatExperienceDuration,
  hasStructuredDatesInRequest,
  rowHasStructuredDates,
  normalizeExperiencePayload,
  mapExperienceForApi,
  compareExperienceRows,
};
