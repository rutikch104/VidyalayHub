// @ts-nocheck
import { Check, Trash2 } from 'lucide-react';
import {
  getNotificationStyle,
  isNotificationUnread,
  formatTimeAgo,
  formatFullDate,
} from './notificationUtils';

export default function NotificationItem({
  notification: n,
  selected,
  onToggleSelect,
  onMarkRead,
  onDelete,
}) {
  const { icon: Icon, tone, label: categoryLabel } = getNotificationStyle(n.type);
  const unread = isNotificationUnread(n);
  const isUrgent = n.priority === 'urgent';
  const isHigh = n.priority === 'high';

  return (
    <article
      className={[
        'notif-item group/item',
        unread ? 'notif-item--unread' : 'notif-item--read',
        selected ? 'notif-item--selected' : '',
        isUrgent ? 'notif-item--urgent' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="notif-item__glow" aria-hidden />

      <div className="notif-item__inner">
        <div className="notif-item__leading">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="notif-item__checkbox"
            aria-label="Select notification"
            onClick={(e) => e.stopPropagation()}
          />

          <div className={`notif-item__icon notif-item__icon--${tone}`}>
            <Icon className="h-5 w-5" aria-hidden />
            {unread ? (
              <span className="notif-item__unread-dot" aria-hidden />
            ) : (
              <span className="notif-item__read-mark" aria-hidden>
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
            )}
          </div>
        </div>

        <div className="notif-item__content">
          <div className="notif-item__meta-row">
            <span className={`notif-item__category notif-item__category--${tone}`}>
              {categoryLabel}
            </span>
            <time
              className="notif-item__time"
              dateTime={n.created_at}
              title={formatFullDate(n.created_at)}
            >
              {formatTimeAgo(n.created_at)}
            </time>
          </div>

          <h3 className="notif-item__title">{n.title}</h3>

          {n.body ? (
            <p className="notif-item__body">{n.body}</p>
          ) : null}

          <div className="notif-item__footer">
            <div className="notif-item__badges">
              {unread ? (
                <span className="notif-item__badge notif-item__badge--new">Unread</span>
              ) : (
                <span className="notif-item__badge notif-item__badge--read">Read</span>
              )}
              {isUrgent && (
                <span className="notif-item__badge notif-item__badge--urgent">Urgent</span>
              )}
              {isHigh && !isUrgent && (
                <span className="notif-item__badge notif-item__badge--high">Important</span>
              )}
            </div>

            <div className="notif-item__actions notif-item__actions--mobile">
              {unread && (
                <button
                  type="button"
                  onClick={() => onMarkRead(n.id)}
                  className="notif-item__action notif-item__action--read"
                  title="Mark as read"
                >
                  <Check className="h-4 w-4" />
                  <span className="sr-only">Mark as read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(n.id)}
                className="notif-item__action notif-item__action--delete"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </button>
            </div>
          </div>
        </div>

        <div className="notif-item__actions notif-item__actions--desktop">
          {unread && (
            <button
              type="button"
              onClick={() => onMarkRead(n.id)}
              className="notif-item__action notif-item__action--read"
              title="Mark as read"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(n.id)}
            className="notif-item__action notif-item__action--delete"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
