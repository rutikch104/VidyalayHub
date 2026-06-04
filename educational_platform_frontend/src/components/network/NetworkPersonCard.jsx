// @ts-nocheck
import { CheckCircle, Clock, MapPin, UserMinus, UserPlus, Users, X, Building2, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ClickableUser from '@/components/ui/ClickableUser';
import { PRESENCE_STATUS } from '@/lib/presence';
import { roleBadgeClass, formatTimeAgo } from './networkUtils';

const ROLE_ACCENT = {
  student: 'from-sky-400/20 via-sky-300/10 to-transparent',
  alumni:  'from-violet-400/20 via-violet-300/10 to-transparent',
  teacher: 'from-amber-400/20 via-amber-300/10 to-transparent',
  staff:   'from-emerald-400/20 via-emerald-300/10 to-transparent',
};

const ROLE_RING = {
  student: 'ring-sky-400/30',
  alumni:  'ring-violet-400/30',
  teacher: 'ring-amber-400/30',
  staff:   'ring-emerald-400/30',
};

export default function NetworkPersonCard({ person, variant = 'connection', busy = false, onConnect, onAccept, onDecline, onWithdraw, onRemove, onFollow, onUnfollow }) {
  const presence =
    person.presence === 'online'  ? PRESENCE_STATUS.ONLINE
    : person.presence === 'away' ? PRESENCE_STATUS.AWAY
    : person.presence === 'busy' ? PRESENCE_STATUS.BUSY
    : PRESENCE_STATUS.OFFLINE;

  const showPresence = variant === 'connection' && person.presence === 'online';
  const accentGradient = ROLE_ACCENT[person.role] || 'from-primary/10 via-primary/5 to-transparent';
  const ringClass = ROLE_RING[person.role] || 'ring-primary/20';

  return (
    <article className="feature-card group flex flex-col overflow-hidden">
      {/* Role-tinted header strip */}
      <div className={cn('h-[3px] w-full bg-gradient-to-r', accentGradient.replace('from-', 'from-').replace('/20', '/60').replace('/10', '/40'))} />

      {/* Avatar + identity — centered */}
      <div className={cn('relative flex flex-col items-center px-5 pb-4 pt-5 text-center bg-gradient-to-b', accentGradient)}>
        <div className={cn('relative ring-2 rounded-full', ringClass)}>
          <ClickableUser
            userId={person.userId}
            name={person.name}
            avatarUrl={person.avatar}
            size="2xl"
            showName={false}
            showStatus={showPresence}
            status={showPresence ? presence : null}
          />
        </div>

        <ClickableUser
          userId={person.userId}
          name={person.name}
          avatarUrl={person.avatar}
          showAvatar={false}
          showName
          showStatus={false}
          className="mt-3 w-full justify-center"
          nameClassName="text-[15px] font-bold text-center"
        />

        {person.title && (
          <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">{person.title}</p>
        )}

        <span className={cn(
          'mt-2.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
          roleBadgeClass(person.role),
        )}>
          {person.role || 'member'}
        </span>
      </div>

      {/* Info section */}
      <div className="flex flex-col gap-2 px-5 pb-3">
        {(person.college || person.location) && (
          <div className="space-y-1 text-[11px] text-muted-foreground">
            {person.college && (
              <p className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3 shrink-0 text-primary/50" />
                <span className="truncate">{person.college}</span>
              </p>
            )}
            {person.location && (
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                <span className="truncate">{person.location}</span>
              </p>
            )}
          </div>
        )}

        {person.bio && (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{person.bio}</p>
        )}

        {/* Suggestion reasons */}
        {person.suggestionReasons?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {person.suggestionReasons.map((r) => (
              <span key={r} className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Sparkles className="h-2.5 w-2.5" />{r}
              </span>
            ))}
          </div>
        )}

        {/* Skills */}
        {person.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {person.skills.slice(0, 3).map((s) => (
              <span key={s} className="rounded-full border border-border/50 bg-muted/40 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {s}
              </span>
            ))}
            {person.skills.length > 3 && (
              <span className="rounded-full border border-border/50 bg-muted/40 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                +{person.skills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-border/50 px-5 py-3">
        {/* Meta row */}
        <div className="mb-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          {person.mutualConnections > 0 ? (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3 text-primary/60" />
              <span><span className="font-bold text-foreground">{person.mutualConnections}</span> mutual</span>
            </span>
          ) : <span />}
          {person.requestDate && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />{formatTimeAgo(person.requestDate)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {(variant === 'suggestions' || variant === 'discover') && (
            <>
              {person.isFollowing ? (
                <button type="button" disabled={busy} onClick={() => onUnfollow?.(person)}
                  className="flex-1 rounded-xl border border-border/60 bg-muted/40 py-2 text-[12px] font-semibold text-foreground transition-all hover:bg-muted/70 disabled:opacity-50">
                  Following
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={() => onFollow?.(person)}
                  className="flex-1 rounded-xl border border-primary/25 bg-primary/8 py-2 text-[12px] font-semibold text-primary transition-all hover:bg-primary/12 disabled:opacity-50">
                  Follow
                </button>
              )}
              {person.connectionStatus === 'pending' ? (
                <span className="flex-1 rounded-xl bg-amber-100/60 py-2 text-center text-[12px] font-bold text-amber-800 ring-1 ring-amber-500/20">
                  {person.connectionDirection === 'incoming' ? 'Respond' : 'Pending'}
                </span>
              ) : person.connectionStatus === 'connected' ? (
                <span className="flex-1 rounded-xl bg-emerald-100/60 py-2 text-center text-[12px] font-bold text-emerald-700 ring-1 ring-emerald-500/20">
                  Connected
                </span>
              ) : (
                <button type="button" disabled={busy} onClick={() => onConnect?.(person)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-primary/85 py-2 text-[12px] font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50 active:scale-100">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  Connect
                </button>
              )}
            </>
          )}

          {variant === 'pending' && (
            <>
              <button type="button" disabled={busy} onClick={() => onAccept?.(person.connectionId || person.id)}
                className="flex-1 rounded-xl bg-emerald-500/12 py-2 text-[12px] font-bold text-emerald-700 ring-1 ring-emerald-500/20 transition-colors hover:bg-emerald-500/20 disabled:opacity-50">
                <CheckCircle className="mr-1.5 inline h-3.5 w-3.5" />Accept
              </button>
              <button type="button" disabled={busy} onClick={() => onDecline?.(person.connectionId || person.id)}
                className="flex-1 rounded-xl border border-border/60 bg-muted/30 py-2 text-[12px] font-bold text-muted-foreground transition-colors hover:bg-muted/60 disabled:opacity-50">
                <X className="mr-1.5 inline h-3.5 w-3.5" />Decline
              </button>
            </>
          )}

          {variant === 'sent' && (
            <button type="button" disabled={busy} onClick={() => onWithdraw?.(person.connectionId || person.id)}
              className="flex-1 rounded-xl border border-border/60 bg-muted/30 py-2 text-[12px] font-semibold text-foreground transition-all hover:bg-muted/60 disabled:opacity-50">
              Withdraw Request
            </button>
          )}

          {variant === 'connection' && (
            <button type="button" disabled={busy} onClick={() => onRemove?.(person.connectionId || person.id)}
              className="ml-auto rounded-xl p-2 text-muted-foreground/60 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Remove connection">
              <UserMinus className="h-4 w-4" />
            </button>
          )}

          {variant === 'following' && (
            <button type="button" disabled={busy} onClick={() => onUnfollow?.(person)}
              className="flex-1 rounded-xl border border-border/60 bg-muted/30 py-2 text-[12px] font-semibold text-foreground transition-all hover:bg-muted/60 disabled:opacity-50">
              Unfollow
            </button>
          )}
        </div>

        {/* Pending message */}
        {person.message && variant === 'pending' && (
          <p className="mt-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-[11px] italic text-muted-foreground">
            &ldquo;{person.message}&rdquo;
          </p>
        )}
      </div>
    </article>
  );
}
