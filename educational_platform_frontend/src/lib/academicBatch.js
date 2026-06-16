/** Academic batch helpers — student (active) vs alumni (completed) */

export const DEFAULT_BATCH_DURATION = 4;

export function formatAcademicBatch(admissionYear, graduationYear) {
  const admission = parseInt(String(admissionYear), 10);
  const graduation = parseInt(String(graduationYear), 10);
  if (Number.isNaN(admission) || Number.isNaN(graduation)) return '';
  return `${admission}-${graduation}`;
}

export function parseAcademicBatch(batch) {
  const match = String(batch || '').trim().match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
  if (!match) return null;
  return { admissionYear: parseInt(match[1], 10), graduationYear: parseInt(match[2], 10) };
}

/** Completed batches only — graduation year strictly before current calendar year */
export function alumniBatchOptions(currentYear = new Date().getFullYear(), lookback = 30) {
  const options = [];
  for (let graduation = currentYear - 1; graduation >= currentYear - lookback; graduation -= 1) {
    const admission = graduation - DEFAULT_BATCH_DURATION;
    if (admission < 1990) break;
    options.push({
      admissionYear: admission,
      graduationYear: graduation,
      batch: formatAcademicBatch(admission, graduation),
    });
  }
  return options;
}

/** Active student batches — graduation year is current year or later */
export function studentBatchOptions(currentYear = new Date().getFullYear(), forward = 4) {
  const options = [];
  for (let graduation = currentYear; graduation <= currentYear + forward; graduation += 1) {
    const admission = graduation - DEFAULT_BATCH_DURATION;
    options.push({
      admissionYear: admission,
      graduationYear: graduation,
      batch: formatAcademicBatch(admission, graduation),
    });
  }
  return options.reverse();
}

export function suggestStudentBatches(currentYear = new Date().getFullYear()) {
  return studentBatchOptions(currentYear).map((o) => o.batch);
}

export function suggestAlumniBatches(currentYear = new Date().getFullYear()) {
  return alumniBatchOptions(currentYear).map((o) => o.batch);
}

export function validateAdmissionGraduationYears(admissionYear, graduationYear) {
  const admission = parseInt(String(admissionYear), 10);
  const graduation = parseInt(String(graduationYear), 10);
  if (Number.isNaN(admission)) return 'Admission year is required.';
  if (Number.isNaN(graduation)) return 'Graduation year is required.';
  if (admission >= graduation) return 'Admission year must be before graduation year.';
  return null;
}

export function validateAlumniBatchRegistration(admissionYear, graduationYear, batch, currentYear = new Date().getFullYear()) {
  const yearErr = validateAdmissionGraduationYears(admissionYear, graduationYear);
  if (yearErr) return yearErr;

  const admission = parseInt(String(admissionYear), 10);
  const graduation = parseInt(String(graduationYear), 10);

  if (graduation >= currentYear) {
    return 'Alumni must select a completed graduation year. Active student batches are not allowed.';
  }

  const expectedBatch = formatAcademicBatch(admission, graduation);
  const submitted = String(batch || '').trim();
  if (submitted && submitted !== expectedBatch) {
    return `Academic batch must be ${expectedBatch} for the selected years.`;
  }

  const validBatches = new Set(alumniBatchOptions(currentYear).map((o) => o.batch));
  if (!validBatches.has(expectedBatch)) {
    return 'Selected years do not form a valid completed alumni batch.';
  }

  return null;
}

export function graduationYearsForAlumniAdmission(admissionYear, currentYear = new Date().getFullYear()) {
  const admission = parseInt(String(admissionYear), 10);
  if (Number.isNaN(admission)) return [];
  return alumniBatchOptions(currentYear)
    .filter((o) => o.admissionYear === admission)
    .map((o) => o.graduationYear);
}

export function admissionYearsForAlumni(currentYear = new Date().getFullYear()) {
  const years = new Set(alumniBatchOptions(currentYear).map((o) => o.admissionYear));
  return [...years].sort((a, b) => b - a);
}
