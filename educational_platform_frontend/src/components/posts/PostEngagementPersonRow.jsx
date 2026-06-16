import UserAvatar from '@/components/ui/UserAvatar';
import AcademicIdentityLine from '@/components/user/AcademicIdentityLine';
import { useProfileNavigationOptional } from '@/contexts/ProfileNavigationContext';

function formatRepostedAt(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function PostEngagementPersonRow({ person, showRepostedAt = false, onNavigate }) {
  const profileNav = useProfileNavigationOptional();
  const name =
    person.full_name ||
    person.name ||
    `${person.first_name || ''} ${person.last_name || ''}`.trim() ||
    'User';

  const handleClick = () => {
    if (!person.id) return;
    onNavigate?.();
    if (profileNav?.openProfile) {
      profileNav.openProfile(person.id);
    }
  };

  const repostedLabel = showRepostedAt ? formatRepostedAt(person.reposted_at) : null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="post-engagement-row group"
    >
      <UserAvatar
        src={person.avatar_url || person.profile_picture}
        alt={name}
        size="md"
        className="post-engagement-row__avatar shrink-0"
      />
      <div className="post-engagement-row__body min-w-0 flex-1 text-left">
        <div className="post-engagement-row__top flex items-start justify-between gap-2">
          <p className="post-engagement-row__name truncate font-semibold text-foreground transition-colors group-hover:text-primary">
            {name}
          </p>
          {person.is_following ? (
            <span className="post-engagement-row__badge shrink-0">Following</span>
          ) : null}
        </div>
        <AcademicIdentityLine
          user={person}
          className="post-engagement-row__identity--academic"
          professionalClassName="post-engagement-row__identity--professional"
        />
        {repostedLabel ? (
          <p className="post-engagement-row__timestamp">{repostedLabel}</p>
        ) : null}
      </div>
    </button>
  );
}
