import { Check, Loader2, UserPlus } from 'lucide-react';
import ClickableUser from '@/components/ui/ClickableUser';
import AcademicIdentityLine from '@/components/user/AcademicIdentityLine';

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

      <div className="home-user-card__body">
        <ClickableUser
          userId={person.id}
          name={person.name}
          avatarUrl={person.avatar}
          showAvatar={false}
          showName
          showStatus={false}
          className="home-user-card__name-link"
          nameClassName="home-user-card__name"
        />

        {(person.academic_identity || person.professional_identity || person.headline) ? (
          <AcademicIdentityLine
            user={{
              academic_identity: person.academic_identity || person.headline,
              professional_identity: person.professional_identity,
              user_type: person.userType || person.role,
              company: person.company,
              position: person.position,
              tenant_name: person.college,
            }}
            className="academic-identity-line--compact home-user-card__identity line-clamp-2"
          />
        ) : null}
      </div>

      <button
        type="button"
        disabled={connected || connectBusy}
        onClick={() => onConnect?.(person.id)}
        aria-label={connected ? 'Connection request sent' : `Connect with ${person.name}`}
        className={[
          'home-user-card__connect',
          connected ? 'home-user-card__connect--sent' : '',
        ].filter(Boolean).join(' ')}
      >
        {connectBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : connected ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <UserPlus className="h-4 w-4" aria-hidden />
        )}
      </button>
    </article>
  );
}
