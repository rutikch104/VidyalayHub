/**
 * Client-side profile strength (0–100) when API omits completion or returns low value.
 */
export function estimateProfileCompletion(profileData) {
  if (!profileData) return 0;
  let points = 0;
  const add = (cond, w) => {
    if (cond) points += w;
  };

  add(profileData.bio?.trim(), 12);
  add(profileData.location?.trim(), 8);
  add(profileData.coverImage, 10);
  add(profileData.phone?.trim(), 8);
  add(!!profileData.socialLinks?.linkedin, 7);
  add(!!profileData.socialLinks?.github, 5);
  add(!!profileData.socialLinks?.twitter, 5);
  add((profileData.professionalInfo?.skills?.length || 0) >= 1, 10);
  add((profileData.professionalInfo?.skills?.length || 0) >= 3, 5);
  add(!!profileData.professionalInfo?.company || !!profileData.professionalInfo?.position, 10);
  add(!!profileData.academicInfo?.university || !!profileData.academicInfo?.course, 10);
  add((profileData.achievements?.length || 0) >= 1, 5);
  add((profileData.clubs?.length || 0) >= 1, 5);

  return Math.min(100, Math.round(points));
}

export function mergeCompletionScore(apiValue, profileData) {
  const api = typeof apiValue === 'number' && !Number.isNaN(apiValue) ? apiValue : 0;
  const est = estimateProfileCompletion(profileData);
  return Math.min(100, Math.max(api, est));
}
