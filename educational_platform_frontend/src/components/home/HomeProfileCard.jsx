import { MapPin, Crown } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import { PRESENCE_STATUS } from '@/lib/presence';
import { mergeProfileCardData } from '@/lib/homeProfileCardHelpers';

const COVER_FALLBACK =
  'https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg?auto=compress&cs=tinysrgb&w=800';

function RoleBadge({ userType, label }) {
  const roleKey = ['student', 'teacher', 'alumni', 'staff'].includes(userType)
    ? userType
    : 'member';
  return (
    <span className={`home-profile-card__role home-profile-card__role--${roleKey}`}>
      {label}
    </span>
  );
}

export default function HomeProfileCard({
  user,
  profile,
  summary,
  coverSrc,
  avatarSrc,
  onViewProfile,
}) {
  const card = mergeProfileCardData({ user, profile, summary });
  const cover = coverSrc || COVER_FALLBACK;

  return (
    <article className="home-profile-card">
      <div className="home-profile-card__cover">
        <img
          src={cover}
          alt=""
          onError={(e) => {
            if (e.currentTarget.src !== COVER_FALLBACK) {
              e.currentTarget.src = COVER_FALLBACK;
            }
          }}
        />
        <div className="home-profile-card__cover-overlay" aria-hidden />
      </div>

      <div className="home-profile-card__body">
        <div className="home-profile-card__avatar-wrap">
          <div className="home-profile-card__avatar-ring">
            <UserAvatar
              src={avatarSrc}
              alt={card.name}
              size="2xl"
              status={PRESENCE_STATUS.ONLINE}
              ring={false}
              imgClassName="border-[3px] border-card"
            />
          </div>
        </div>

        <div className="home-profile-card__identity">
          <div className="home-profile-card__name-row">
            <h3 className="home-profile-card__name">{card.name}</h3>
            {card.isPremium || card.isVerified ? (
              <Crown
                className="home-profile-card__badge-icon h-3.5 w-3.5 text-amber-500"
                aria-hidden
              />
            ) : null}
          </div>

          <p className="home-profile-card__headline">{card.headline}</p>

          <RoleBadge userType={card.userType} label={card.roleLabel} />

          {(card.location) && (
            <div className="home-profile-card__meta">
              {card.location ? (
                <p className="home-profile-card__meta-row home-profile-card__meta-row--location">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  <span title={card.location}>{card.location}</span>
                </p>
              ) : null}
            </div>
          )}

          <button type="button" onClick={onViewProfile} className="home-profile-card__cta">
            View Profile
          </button>
        </div>
      </div>
    </article>
  );
}
