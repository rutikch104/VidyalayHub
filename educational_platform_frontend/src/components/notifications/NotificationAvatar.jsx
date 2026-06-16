// @ts-nocheck
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  getNotificationStyle,
  initialsFromName,
  resolveNotificationActor,
} from './notificationUtils';

const AVATAR_PALETTES = [
  'from-violet-500 to-violet-600',
  'from-sky-500 to-sky-600',
  'from-emerald-500 to-emerald-600',
  'from-rose-500 to-rose-600',
  'from-amber-500 to-amber-600',
  'from-indigo-500 to-indigo-600',
  'from-teal-500 to-teal-600',
  'from-fuchsia-500 to-fuchsia-600',
];

function paletteForName(name) {
  if (!name) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

export default function NotificationAvatar({
  notification,
  actors = null,
  groupCount = 0,
  size = 'md',
  showTypeBadge = true,
  className,
}) {
  const type = notification?.type;
  const { icon: Icon, tone } = getNotificationStyle(type);
  const actorList =
    actors && actors.length > 0
      ? actors
      : [resolveNotificationActor(notification)].filter(Boolean);

  const sizeClasses = {
    sm: { box: 'h-10 w-10', badge: 'h-[18px] w-[18px] bottom-0 right-0', icon: 'h-2.5 w-2.5', text: 'text-xs' },
    md: { box: 'h-11 w-11', badge: 'h-[18px] w-[18px] bottom-0 right-0', icon: 'h-2.5 w-2.5', text: 'text-sm' },
  };
  const cfg = sizeClasses[size] || sizeClasses.md;
  const actor = actorList[0];

  if (actor) {
    return (
      <div className={cn('notif-item__avatar-wrap relative shrink-0', className)}>
        <AvatarCircle actor={actor} cfg={cfg} />
        {groupCount > 1 ? (
          <span className="notif-item__group-count" aria-hidden>
            +{groupCount - 1}
          </span>
        ) : null}
        {showTypeBadge ? (
          <TypeBadge Icon={Icon} tone={tone} cfg={cfg} />
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('notif-item__avatar-wrap relative shrink-0', className)}>
      <div
        className={cn(
          'notif-item__system-avatar',
          cfg.box,
          `notif-item__system-avatar--${tone}`,
        )}
        aria-hidden
      >
        <Icon className="h-5 w-5 opacity-90" />
      </div>
    </div>
  );
}

function AvatarCircle({ actor, cfg }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = initialsFromName(actor?.name);
  const palette = paletteForName(actor?.name);
  const showImage = Boolean(actor?.avatar_url) && !imgFailed;

  return (
    <div className={cn('notif-item__avatar', cfg.box)}>
      {showImage ? (
        <img
          src={actor.avatar_url}
          alt=""
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className={cn(
            'notif-item__avatar-initials flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-white',
            palette,
            cfg.text,
          )}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

function TypeBadge({ Icon, tone, cfg }) {
  return (
    <span
      className={cn(
        'notif-item__type-badge absolute flex items-center justify-center rounded-full ring-2 ring-card',
        cfg.badge,
        `notif-item__type-badge--${tone}`,
      )}
      aria-hidden
    >
      <Icon className={cfg.icon} strokeWidth={2.5} />
    </span>
  );
}
