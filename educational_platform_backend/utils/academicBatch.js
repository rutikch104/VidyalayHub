/** Academic batch helpers — student (active) vs alumni (completed) */

const DEFAULT_BATCH_DURATION = 4;

function formatAcademicBatch(admissionYear, graduationYear) {
  const admission = parseInt(String(admissionYear), 10);
  const graduation = parseInt(String(graduationYear), 10);
  if (Number.isNaN(admission) || Number.isNaN(graduation)) return '';
  return `${admission}-${graduation}`;
}

function alumniBatchOptions(currentYear = new Date().getFullYear(), lookback = 30) {
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

function studentBatchOptions(currentYear = new Date().getFullYear(), forward = 4) {
  const options = [];
  for (let graduation = currentYear; graduation <= currentYear + forward; graduation += 1) {
    const admission = graduation - DEFAULT_BATCH_DURATION;
    options.push({
      admissionYear: admission,
      graduationYear: graduation,
      batch: formatAcademicBatch(admission, graduation),
    });
  }
  return options;
}

function validateAdmissionGraduationYears(admissionYear, graduationYear) {
  const admission = parseInt(String(admissionYear), 10);
  const graduation = parseInt(String(graduationYear), 10);
  if (Number.isNaN(admission)) return 'Admission year is required.';
  if (Number.isNaN(graduation)) return 'Graduation year is required.';
  if (admission >= graduation) return 'Admission year must be before graduation year.';
  return null;
}

function validateAlumniBatchRegistration(admissionYear, graduationYear, batch, currentYear = new Date().getFullYear()) {
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

function validateStudentBatchRegistration(batch, currentYear = new Date().getFullYear()) {
  const submitted = String(batch || '').trim();
  if (!submitted) return 'Academic batch is required.';
  const validBatches = new Set(studentBatchOptions(currentYear).map((o) => o.batch));
  if (!validBatches.has(submitted)) {
    return 'Selected academic batch is not valid for current students.';
  }
  return null;
}

module.exports = {
  DEFAULT_BATCH_DURATION,
  formatAcademicBatch,
  alumniBatchOptions,
  studentBatchOptions,
  validateAdmissionGraduationYears,
  validateAlumniBatchRegistration,
  validateStudentBatchRegistration,
};
