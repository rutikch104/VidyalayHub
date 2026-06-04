import { collectSkillNames } from '@/components/profile/premium/ProfileSkillsGrid';

export const PROFILE_ABOUT_MAX_CHARS = 2000;
export const PROFILE_SKILLS_MAX = 10;

export function clampAboutText(text) {
  return String(text ?? '').slice(0, PROFILE_ABOUT_MAX_CHARS);
}

export function formatAboutCharCount(length) {
  const len = Math.min(Math.max(0, length), PROFILE_ABOUT_MAX_CHARS);
  return `${len.toLocaleString()} / ${PROFILE_ABOUT_MAX_CHARS.toLocaleString()} characters`;
}

export function isAboutAtLimit(length) {
  return length >= PROFILE_ABOUT_MAX_CHARS;
}

export function countManagedSkills(skillsDetailed = []) {
  return Array.isArray(skillsDetailed) ? skillsDetailed.length : 0;
}

export function countDisplaySkills(skillsDetailed = [], skills = []) {
  return collectSkillNames(skillsDetailed, skills).length;
}

export function formatSkillsCount(managedCount) {
  return `${managedCount} / ${PROFILE_SKILLS_MAX} skills`;
}

export function isSkillsAtLimit(managedCount) {
  return managedCount >= PROFILE_SKILLS_MAX;
}
