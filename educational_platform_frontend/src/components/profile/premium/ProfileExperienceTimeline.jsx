import { Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatExperienceDuration } from '@/components/profile/experienceDates';

/**
 * Single experience entry — premium card (profile view + edit modal).
 */
export function ProfileExperienceEntry({
  ex,
  className,
  actions,
  compactDescription = false,
  ...rest
}) {
  const duration = formatExperienceDuration(ex);

  return (
    <article
      className={cn(
        'premium-profile-experience-card',
        actions && 'group premium-profile-experience-card--has-actions',
        className,
      )}
      aria-label={[ex.title, ex.company].filter(Boolean).join(' at ')}
      {...rest}
    >
      <div className="premium-profile-experience-card__body">
        <div className="premium-profile-experience-card__icon" aria-hidden>
          <Briefcase className="h-4 w-4" strokeWidth={1.85} />
        </div>
        <div className="premium-profile-experience-card__content">
          <div className="premium-profile-experience-card__header">
            <div className="premium-profile-experience-card__titles">
              <h3 className="premium-profile-experience-card__title">{ex.title}</h3>
              {ex.company ? (
                <p className="premium-profile-experience-card__company">{ex.company}</p>
              ) : null}
            </div>
            {duration ? (
              <p className="premium-profile-experience-card__dates">{duration}</p>
            ) : null}
          </div>
          {ex.description ? (
            <p
              className={cn(
                'premium-profile-experience-card__description',
                compactDescription && 'premium-profile-experience-card__description--clamp',
              )}
            >
              {ex.description}
            </p>
          ) : null}
          {ex.location ? (
            <p className="premium-profile-experience-card__location">{ex.location}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="premium-profile-experience-card__actions">{actions}</div>
        ) : null}
      </div>
    </article>
  );
}

export default function ProfileExperienceTimeline({ items = [] }) {
  if (!items.length) {
    return (
      <p className="premium-profile-experience-list__empty">
        No experience listed yet.
      </p>
    );
  }

  return (
    <div className="premium-profile-experience-list" role="list">
      {items.map((ex) => (
        <ProfileExperienceEntry
          key={ex.id || `${ex.title}-${ex.company}`}
          ex={ex}
          role="listitem"
        />
      ))}
    </div>
  );
}
