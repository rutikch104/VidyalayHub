/**
 * AlumniDetails.work_experience is a short free-text field (e.g. "5 years"),
 * not the aggregated summary built from UserExperience rows.
 */
function isAggregatedExperienceSummary(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  return (s.includes(' · ') && s.includes(' @ ')) || s.length > 120;
}

function normalizeAlumniWorkExperience(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (isAggregatedExperienceSummary(s)) return null;
  return s.slice(0, 500);
}

module.exports = {
  isAggregatedExperienceSummary,
  normalizeAlumniWorkExperience,
};
