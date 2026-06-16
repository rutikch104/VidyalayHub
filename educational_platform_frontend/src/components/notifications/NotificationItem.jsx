// @ts-nocheck
import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useProfileNavigationOptional } from '@/contexts/ProfileNavigationContext';
import notificationService from '@/services/notificationService';
import NotificationAvatar from './NotificationAvatar';
import {
  isNotificationUnread,
  formatTimeAgo,
  formatFullDate,
  resolveNotificationActor,
  getNotificationActionText,
  getNotificationPreview,
  getNotificationPrimaryAction,
  formatGroupedActorNames,
  getGroupedActionText,
  executeNotificationNavigation,
  canonicalNotificationType,
} from './notificationUtils';
import { UNAVAILABLE_MESSAGE } from '@/lib/notificationNavigation';

function NotificationMessage({ actor, actionText, isGrouped, groupedLabel, onActorClick }) {
  if (isGrouped && groupedLabel) {
    return (
      <p className="notif-item__message">
        <span className="notif-item__actor-name">{groupedLabel}</span>{' '}
        <span className="notif-item__action-text">{actionText}</span>
      </p>
    );
  }

  if (actor?.name) {
    return (
      <p className="notif-item__message">
        <button
          type="button"
          className="notif-item__actor-name notif-item__actor-link"
          onClick={(e) => {
            e.stopPropagation();
            onActorClick?.(actor.id);
          }}
          disabled={!actor.id || !onActorClick}
        >
          {actor.name}
        </button>{' '}
        <span className="notif-item__action-text">{actionText}</span>
      </p>
    );
  }

  return (
    <p className="notif-item__message">
      <span className="notif-item__action-text">{actionText}</span>
    </p>
  );
}

export default function NotificationItem({
  entry,
  selected,
  onToggleSelect,
  onMarkRead,
  onDelete,
  onNavigate,
}) {
  const profileNav = useProfileNavigationOptional();
  const isGroup = entry?.kind === 'group';
  const notification = isGroup ? entry.items[0] : entry?.item;
  if (!notification) return null;

  const unread = isGroup
    ? entry.items.some(isNotificationUnread)
    : isNotificationUnread(notification);

  const actors = isGroup
    ? entry.items.map(resolveNotificationActor).filter(Boolean)
    : [resolveNotificationActor(notification)].filter(Boolean);

  const actor = actors[0] || null;
  const actionText = isGroup
    ? getGroupedActionText(entry.type, entry.items.length)
    : getNotificationActionText(notification);

  const groupedLabel = isGroup ? formatGroupedActorNames(actors) : null;
  const preview = isGroup
    ? getNotificationPreview(entry.items.find((n) => getNotificationPreview(n)) || notification)
    : getNotificationPreview(notification);

  const primaryAction = getNotificationPrimaryAction(notification);
  const timestamp = notification.created_at;
  const notifType = canonicalNotificationType(notification.type);

  const openProfile = (userId) => {
    if (userId) profileNav?.openProfile?.(userId);
  };

  const markEntryRead = () => {
    if (isGroup) {
      entry.items.filter(isNotificationUnread).forEach((n) => onMarkRead?.(n.id));
    } else {
      onMarkRead?.(notification.id);
    }
  };

  const deleteEntry = () => {
    if (isGroup) {
      entry.items.forEach((n) => onDelete(n.id));
    } else {
      onDelete(notification.id);
    }
  };

  const [navigating, setNavigating] = useState(false);

  const handleNavigate = async () => {
    if (navigating) return;
    setNavigating(true);
    try {
      if (unread) markEntryRead();

      const result = await executeNotificationNavigation(notification, {
        onNavigate,
        openProfile: profileNav?.openProfile,
        resolveTarget: (id) => notificationService.resolveNotificationTarget(id),
        onUnavailable: (message) => toast.error(message || UNAVAILABLE_MESSAGE),
      });

      if (result?.ok === false && result?.reason === 'no_target') {
        toast.error(UNAVAILABLE_MESSAGE);
      }
    } finally {
      setNavigating(false);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigate();
        }
      }}
      className={[
        'notif-item group/item cursor-pointer',
        unread ? 'notif-item--unread' : 'notif-item--read',
        selected ? 'notif-item--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="notif-item__glow" aria-hidden />

      <div className="notif-item__inner">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="notif-item__checkbox"
          aria-label="Select notification"
          onClick={(e) => e.stopPropagation()}
        />

        <NotificationAvatar
          notification={notification}
          actors={isGroup ? actors : null}
          groupCount={isGroup ? entry.items.length : 0}
        />

        <div className="notif-item__main">
          <NotificationMessage
            actor={actor}
            actionText={actionText}
            isGrouped={isGroup}
            groupedLabel={groupedLabel}
            onActorClick={openProfile}
          />

          {preview ? (
            <p className="notif-item__preview">
              {notifType === 'comment' ? (
                <span className="notif-item__preview-label">Comment: </span>
              ) : notifType === 'like' ? (
                <span className="notif-item__preview-label">Post: </span>
              ) : null}
              <span className="notif-item__preview-text">
                &ldquo;{preview.length > 120 ? `${preview.slice(0, 120)}…` : preview}&rdquo;
              </span>
            </p>
          ) : null}

          <div className="notif-item__meta">
            <time dateTime={timestamp} title={formatFullDate(timestamp)}>
              {formatTimeAgo(timestamp)}
            </time>
            {primaryAction ? (
              <>
                <span className="notif-item__meta-sep" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  className="notif-item__link"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate();
                  }}
                >
                  {primaryAction.label}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="notif-item__actions">
          {unread ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                markEntryRead();
              }}
              className="notif-item__action notif-item__action--read"
              title="Mark as read"
            >
              <Check className="h-4 w-4" />
              <span className="sr-only">Mark as read</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteEntry();
            }}
            className="notif-item__action notif-item__action--delete"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </button>
        </div>
      </div>
    </article>
  );
}
