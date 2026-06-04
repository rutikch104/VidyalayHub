import { GraduationCap } from 'lucide-react';
import ProfileEmptyState from '@/components/profile/premium/ProfileEmptyState';
import { cn } from '@/lib/utils';
import {
  formatDegreeFieldLine,
  formatEducationDuration,
  formatEducationGradeLine,
} from '@/components/profile/educationDates';

export function ProfileEducationEntry({
  edu,
  className,
  actions,
  compactDescription = false,
  ...rest
}) {
  const institution = edu.institution_name || edu.school || 'Institution';
  const degreeLine = formatDegreeFieldLine(edu);
  const duration = formatEducationDuration(edu);
  const gradeLine = edu.grade_line || formatEducationGradeLine(edu);

  return (
    <article
      className={cn(
        'premium-profile-education-card',
        actions && 'group premium-profile-education-card--has-actions',
        className,
      )}
      aria-label={institution}
      {...rest}
    >
      <div className="premium-profile-education-card__body">
        <div className="premium-profile-education-card__icon" aria-hidden>
          <GraduationCap className="h-4 w-4" strokeWidth={1.85} />
        </div>
        <div className="premium-profile-education-card__content">
          <div className="premium-profile-education-card__header">
            <div className="premium-profile-education-card__titles">
              <h3 className="premium-profile-education-card__institution">{institution}</h3>
              {degreeLine ? (
                <p className="premium-profile-education-card__degree">{degreeLine}</p>
              ) : null}
            </div>
            {duration ? (
              <p className="premium-profile-education-card__dates">{duration}</p>
            ) : null}
          </div>
          {gradeLine ? (
            <p className="premium-profile-education-card__grade">{gradeLine}</p>
          ) : null}
          {edu.description ? (
            <p
              className={cn(
                'premium-profile-education-card__description',
                compactDescription && 'premium-profile-education-card__description--clamp',
              )}
            >
              {edu.description}
            </p>
          ) : null}
          {edu.achievements ? (
            <p className="premium-profile-education-card__achievements">
              <span className="premium-profile-education-card__achievements-label">Achievements: </span>
              {edu.achievements}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="premium-profile-education-card__actions">{actions}</div>
        ) : null}
      </div>
    </article>
  );
}

export function ProfileEducationSectionBody({
  educationList = [],
  canEdit = false,
  onEditEducation,
}) {
  const list = Array.isArray(educationList) ? educationList : [];

  if (list.length > 0) {
    return <ProfileEducationList items={list} />;
  }

  return (
    <ProfileEmptyState
      icon={GraduationCap}
      title="No education yet"
      description={
        canEdit
          ? 'Add schools, degrees, and programs you have completed or are pursuing.'
          : 'No education listed yet.'
      }
      action={
        canEdit ? (
          <button type="button" className="app-btn-primary text-sm" onClick={() => onEditEducation?.()}>
            Add education
          </button>
        ) : null
      }
    />
  );
}

export default function ProfileEducationList({ items = [] }) {
  if (!items.length) {
    return (
      <p className="premium-profile-education-list__empty">
        No education listed yet.
      </p>
    );
  }

  return (
    <div className="premium-profile-education-list" role="list">
      {items.map((edu) => (
        <ProfileEducationEntry
          key={edu.id || `${edu.institution_name}-${edu.degree}`}
          edu={edu}
          role="listitem"
        />
      ))}
    </div>
  );
}
