// @ts-nocheck
import {
  BadgeCheck,
  CheckCircle,
  Clock,
  Loader2,
  Sparkles,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ClickableUser from '@/components/ui/ClickableUser';
import {
  resolveAcademicIdentity,
  resolveProfessionalIdentity,
} from '@/lib/academicIdentity';
import { PRESENCE_STATUS } from '@/lib/presence';
import { formatTimeAgo } from './networkUtils';

const COVER_GRADIENT = {
  student: 'home-profile-card__cover--student',
  alumni: 'home-profile-card__cover--alumni',
  teacher: 'home-profile-card__cover--teacher',
  staff: 'home-profile-card__cover--staff',
};

function buildIdentityUser(person) {
  return {
    ...person,
    user_type: person.role,
    tenant_name: person.college,
    college_name: person.college,
    professional_identity: person.professional_identity,
    position: person.position,
    company: person.company,
  };
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function isDuplicateText(a, b) {
  if (!a || !b) return false;
  const left = normalizeText(a);
  const right = normalizeText(b);
  return left === right || left.includes(right) || right.includes(left);
}

function resolveProfessionalLine(person) {
  if (person.role === 'teacher' || person.role === 'staff') return null;

  let line = person.professional_identity?.trim() || null;
  const identityUser = buildIdentityUser(person);

  if (!line && person.role === 'alumni') {
    line = resolveProfessionalIdentity(identityUser);
  }

  if (!line && person.role === 'student') {
    const parts = [person.position, person.company].filter(Boolean);
    line = parts.length ? parts.join(' • ') : null;
  }

  if (!line) return null;
  if (person.college && isDuplicateText(line, person.college)) return null;
  if (person.academic_identity && isDuplicateText(line, person.academic_identity)) return null;

  return line;
}

function formatMutualBadge(count) {
  if (count <= 0) return null;
  return `${count} mutual`;
}

const ACADEMIC_REASON_KEYS = new Set([
  'same college',
  'same degree',
  'same branch',
  'same academic year',
  'same batch',
  'same department',
]);

function getReasonPriority(label) {
  const value = String(label || '').toLowerCase();
  if (value.includes('mutual connection')) return 100;
  if (value.includes('mutual follower')) return 95;
  if (value === 'same department') return 88;
  if (value === 'same batch') return 86;
  if (value.includes('shared') && value.includes('skill')) return 78;
  if (value.includes('shared communit')) return 76;
  if (value === 'same company') return 72;
  if (value === 'same designation') return 70;
  if (ACADEMIC_REASON_KEYS.has(value)) return 35;
  if (value.startsWith('also a ')) return 28;
  return 50;
}

function shortenAcademicPart(part) {
  const value = part.trim().toLowerCase();
  if (value === 'academic year') return 'year';
  return part.trim();
}

/** Compact, prioritized presentation for Suggested People only. */
function buildCompactSuggestionContext(person) {
  const seen = new Set();
  const rawReasons = (person.suggestionReasons || []).filter((reason) => {
    const key = reason.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const academic = [];
  const signals = [];

  for (const reason of rawReasons) {
    const key = reason.trim().toLowerCase();
    if (key.includes('mutual connection') && person.mutualConnections > 0) {
      continue;
    }
    if (ACADEMIC_REASON_KEYS.has(key)) {
      academic.push(shortenAcademicPart(reason.replace(/^Same\s+/i, '')));
    } else {
      signals.push(reason);
    }
  }

  if (person.mutualFollowers > 0) {
    signals.push(
      `${person.mutualFollowers} mutual follower${person.mutualFollowers === 1 ? '' : 's'}`,
    );
  }

  if (person.sharedCommunitiesCount > 0) {
    signals.push(
      `${person.sharedCommunitiesCount} shared communit${person.sharedCommunitiesCount === 1 ? 'y' : 'ies'}`,
    );
  }

  signals.sort((a, b) => getReasonPriority(b) - getReasonPriority(a));

  const items = signals.slice(0, 2).map((label, index) => ({
    key: `signal-${index}-${label}`,
    label,
    variant: 'chip',
  }));

  if (academic.length) {
    items.push({
      key: 'academic-cluster',
      label: academic
        .slice(0, 4)
        .map((part) => `Same ${part.charAt(0).toLowerCase()}${part.slice(1)}`)
        .join(' · '),
      variant: 'merged',
    });
  }

  return items.slice(0, 3);
}

function buildNetworkingContext(person) {
  const items = [];

  for (const reason of person.suggestionReasons || []) {
    items.push({ key: `reason-${reason}`, label: reason, variant: 'chip' });
  }

  if (person.sharedCommunitiesCount > 0) {
    items.push({
      key: 'communities',
      label: `${person.sharedCommunitiesCount} shared communit${person.sharedCommunitiesCount === 1 ? 'y' : 'ies'}`,
      variant: 'chip',
    });
  }

  if (person.mutualFollowers > 0) {
    items.push({
      key: 'followers',
      label: `${person.mutualFollowers} mutual follower${person.mutualFollowers === 1 ? '' : 's'}`,
      variant: 'chip',
    });
  }

  return items;
}

function NetworkingContext({ items, compact = false }) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        'home-profile-card__network-context',
        compact && 'home-profile-card__network-context--compact',
      )}
    >
      {items.map(({ key, label, variant }) => (
        <span
          key={key}
          className={cn(
            'home-profile-card__network-context-item',
            variant === 'merged' && 'home-profile-card__network-context-item--merged',
          )}
        >
          {variant !== 'merged' ? (
            <Sparkles className="h-2.5 w-2.5 shrink-0 opacity-80" aria-hidden />
          ) : null}
          {label}
        </span>
      ))}
    </div>
  );
}

export default function NetworkPersonCard({
  person,
  variant = 'connection',
  busy = false,
  onConnect,
  onAccept,
  onDecline,
  onWithdraw,
  onRemove,
  onFollow,
  onUnfollow,
}) {
  const presence =
    person.presence === 'online'
      ? PRESENCE_STATUS.ONLINE
      : person.presence === 'away'
        ? PRESENCE_STATUS.AWAY
        : person.presence === 'busy'
          ? PRESENCE_STATUS.BUSY
          : PRESENCE_STATUS.OFFLINE;

  const showPresence = person.presence === 'online';
  const roleKey = person.role || 'member';
  const identityUser = buildIdentityUser(person);
  const academicLine = resolveAcademicIdentity(identityUser) || person.title;
  const professionalLine = resolveProfessionalLine(person);
  const coverMutual = formatMutualBadge(person.mutualConnections);
  const isSuggestions = variant === 'suggestions';
  const networkingContext = isSuggestions
    ? buildCompactSuggestionContext(person)
    : buildNetworkingContext(person);

  return (
    <article
      className={cn(
        'home-profile-card home-profile-card--network home-profile-card--lovable home-profile-card--streamlined',
        `home-profile-card--${roleKey}`,
        isSuggestions && 'home-profile-card--suggestions',
      )}
    >
      <div className={cn('home-profile-card__cover', COVER_GRADIENT[roleKey] || '')}>
        <div className="home-profile-card__cover-pattern" aria-hidden />
        <div className="home-profile-card__cover-overlay home-profile-card__cover-overlay--network" aria-hidden />
        {coverMutual ? (
          <span className="home-profile-card__cover-badge">
            <Users className="h-3 w-3" aria-hidden />
            {coverMutual}
          </span>
        ) : null}
      </div>

      <div className="home-profile-card__body">
        <div className="home-profile-card__avatar-wrap">
          <div className="home-profile-card__avatar-ring">
            <ClickableUser
              userId={person.userId}
              name={person.name}
              avatarUrl={person.avatar}
              size="2xl"
              showName={false}
              showStatus={showPresence}
              status={showPresence ? presence : null}
              className="home-profile-card__avatar-link"
            />
          </div>
        </div>

        <div className="home-profile-card__identity">
          <div className="home-profile-card__identity-zone">
            <div className="home-profile-card__name-row">
              <ClickableUser
                userId={person.userId}
                name={person.name}
                avatarUrl={person.avatar}
                showAvatar={false}
                showName
                showStatus={false}
                className="min-w-0"
                nameClassName="home-profile-card__name"
              />
              {person.isVerified ? (
                <BadgeCheck
                  className="home-profile-card__verified h-4 w-4 shrink-0"
                  aria-label="Verified"
                />
              ) : null}
            </div>

            {academicLine ? (
              <p className="home-profile-card__academic-line">{academicLine}</p>
            ) : null}

            {professionalLine ? (
              <p className="home-profile-card__professional-line">{professionalLine}</p>
            ) : null}
          </div>

          {(networkingContext.length > 0 || person.requestDate || person.message) ? (
            <div className="home-profile-card__context-zone">
              {networkingContext.length > 0 ? (
                <NetworkingContext items={networkingContext} compact={isSuggestions} />
              ) : null}

              {person.requestDate ? (
                <p className="home-profile-card__network-time">
                  <Clock className="h-3 w-3" aria-hidden />
                  {formatTimeAgo(person.requestDate)}
                </p>
              ) : null}

              {person.message && variant === 'pending' ? (
                <p className="home-profile-card__message">&ldquo;{person.message}&rdquo;</p>
              ) : null}
            </div>
          ) : null}

          <div className="home-profile-card__actions-zone">
            <div className="home-profile-card__actions">
              {(variant === 'suggestions' || variant === 'discover') && (
                <>
                  {person.connectionStatus === 'pending' ? (
                    <span className="home-profile-card__btn home-profile-card__btn--pending home-profile-card__btn--static home-profile-card__btn--lead">
                      {person.connectionDirection === 'incoming' ? 'Pending' : 'Sent'}
                    </span>
                  ) : person.connectionStatus === 'connected' ? (
                    <span className="home-profile-card__btn home-profile-card__btn--connected home-profile-card__btn--static home-profile-card__btn--lead">
                      <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                      Connected
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onConnect?.(person)}
                      className="home-profile-card__btn home-profile-card__btn--primary home-profile-card__btn--lead"
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Connect
                    </button>
                  )}
                  {person.isFollowing ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onUnfollow?.(person)}
                      className="home-profile-card__btn home-profile-card__btn--secondary home-profile-card__btn--trail"
                    >
                      Following
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onFollow?.(person)}
                      className="home-profile-card__btn home-profile-card__btn--secondary home-profile-card__btn--trail"
                    >
                      Follow
                    </button>
                  )}
                </>
              )}

              {variant === 'pending' && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAccept?.(person.connectionId || person.id)}
                    className="home-profile-card__btn home-profile-card__btn--primary home-profile-card__btn--lead"
                  >
                    <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDecline?.(person.connectionId || person.id)}
                    className="home-profile-card__btn home-profile-card__btn--secondary home-profile-card__btn--trail"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                    Ignore
                  </button>
                </>
              )}

              {variant === 'sent' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onWithdraw?.(person.connectionId || person.id)}
                  className="home-profile-card__btn home-profile-card__btn--secondary home-profile-card__btn--full"
                >
                  Withdraw request
                </button>
              )}

              {variant === 'connection' && (
                <>
                  <span className="home-profile-card__btn home-profile-card__btn--connected home-profile-card__btn--static home-profile-card__btn--lead">
                    <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                    Connected
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRemove?.(person.connectionId || person.id)}
                    className="home-profile-card__btn home-profile-card__btn--secondary home-profile-card__btn--trail"
                    title="Remove connection"
                  >
                    <UserMinus className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </button>
                </>
              )}

              {variant === 'following' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onUnfollow?.(person)}
                  className="home-profile-card__btn home-profile-card__btn--secondary home-profile-card__btn--full"
                >
                  Unfollow
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
