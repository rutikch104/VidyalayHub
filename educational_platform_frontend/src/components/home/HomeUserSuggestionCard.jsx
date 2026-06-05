import { Loader2, MapPin, UserPlus } from 'lucide-react';
import ClickableUser from '@/components/ui/ClickableUser';

function RoleBadge({ userType, label }) {
  const roleKey = ['student', 'teacher', 'alumni', 'staff'].includes(userType)
    ? userType
    : 'member';
  return (
    <span className={`home-user-card__role home-user-card__role--${roleKey}`}>
      {label}
    </span>
  );
}

export default function HomeUserSuggestionCard({
  person,
  connectBusy = false,
  connected = false,
  onConnect,
}) {
  return (
    <article className="home-user-card">
      <ClickableUser
        userId={person.id}
        name={person.name}
        avatarUrl={person.avatar}
        size="md"
        showName={false}
        showStatus={false}
        className="home-user-card__avatar"
      />

      <div className="home-user-card__content">
        <ClickableUser
          userId={person.id}
          name={person.name}
          avatarUrl={person.avatar}
          showAvatar={false}
          showName
          showStatus={false}
          className="block w-full"
          nameClassName="home-user-card__name hover:text-primary"
        />

        {person.headline ? (
          <p className="home-user-card__headline" title={person.headline}>
            {person.headline}
          </p>
        ) : null}

        <div className="home-user-card__meta">
          <RoleBadge userType={person.userType} label={person.roleLabel} />
          {person.location ? (
            <span className="home-user-card__location" title={person.location}>
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span>{person.location}</span>
            </span>
          ) : null}
        </div>

        {person.institution ? (
          <p className="mt-1 truncate text-[0.625rem] font-medium text-muted-foreground">
            {person.institution}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        disabled={connected || connectBusy}
        onClick={() => onConnect?.(person.id)}
        className="home-user-card__connect inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-all hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {connectBusy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <UserPlus className="h-3 w-3" />
        )}
        {connected ? 'Sent' : 'Connect'}
      </button>
    </article>
  );
}
