import ProfileSkillsGrid, { collectSkillNames } from '@/components/profile/premium/ProfileSkillsGrid';
import {
  PROFILE_ABOUT_MAX_CHARS,
  PROFILE_SKILLS_MAX,
  clampAboutText,
} from '@/components/profile/profileLimits';

export function ProfileAboutContent({ bio, canEdit, emptyHint }) {
  const text = bio ? clampAboutText(bio) : '';

  if (text) {
    return (
      <p className="premium-profile-about__text whitespace-pre-wrap">{text}</p>
    );
  }
  if (canEdit) {
    return (
      <p className="premium-profile-about__empty">{emptyHint}</p>
    );
  }
  return (
    <p className="premium-profile-about__empty premium-profile-about__empty--muted">
      No bio added yet.
    </p>
  );
}

export function ProfileAboutCharHint() {
  return (
    <p className="premium-profile-about__limit-hint">
      Up to {PROFILE_ABOUT_MAX_CHARS.toLocaleString()} characters
    </p>
  );
}

export function ProfileSkillsSectionBody({
  skillsDetailed = [],
  skills = [],
  canEdit,
  onEditSkills,
}) {
  const names = collectSkillNames(skillsDetailed, skills);
  const managedCount = skillsDetailed?.length || 0;
  const hasSkills = names.length > 0;

  if (!hasSkills) {
    return (
      <div className="premium-profile-skills-empty">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {canEdit
            ? `Add up to ${PROFILE_SKILLS_MAX} skills to showcase your expertise — e.g. React.js, Node.js, or AWS.`
            : 'No skills listed yet.'}
        </p>
        {canEdit && onEditSkills ? (
          <button type="button" className="app-btn-primary mt-4 text-sm" onClick={onEditSkills}>
            Add skills
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="premium-profile-skills-section">
      {canEdit ? (
        <p className="premium-profile-skills-section__meta">
          <span className="premium-profile-skills-section__count">
            {managedCount} / {PROFILE_SKILLS_MAX} skills
          </span>
        </p>
      ) : null}
      <ProfileSkillsGrid skillsDetailed={skillsDetailed} skills={skills} />
    </div>
  );
}
