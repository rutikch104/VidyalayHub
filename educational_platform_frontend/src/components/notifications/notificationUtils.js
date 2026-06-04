import {
  Bell,
  User,
  MessageCircle,
  Heart,
  Share2,
  Award,
  Calendar,
  BookOpen,
  Star,
} from 'lucide-react';

export function canonicalNotificationType(type) {
  const legacy = {
    post_like: 'like',
    post_comment: 'comment',
    post_mention: 'mention',
    question_answer: 'answer',
    question_answered: 'answer',
    question_mention: 'mention',
    question_liked: 'like',
    question_comment: 'comment',
  };
  return legacy[type] || type;
}

export function isNotificationUnread(n) {
  if (n.is_read === true) return false;
  if (n.is_read === false) return true;
  return !n.read_at;
}

export function getNotificationStyle(type) {
  const t = canonicalNotificationType(type);
  switch (t) {
    case 'like':
      return { icon: Heart, tone: 'rose', label: 'Like' };
    case 'comment':
      return { icon: MessageCircle, tone: 'sky', label: 'Comment' };
    case 'mention':
      return { icon: User, tone: 'emerald', label: 'Mention' };
    case 'message':
      return { icon: MessageCircle, tone: 'emerald', label: 'Message' };
    case 'answer':
      return { icon: BookOpen, tone: 'cyan', label: 'Answer' };
    case 'follow':
      return { icon: User, tone: 'violet', label: 'Follow' };
    case 'connection_request':
      return { icon: User, tone: 'violet', label: 'Connection' };
    case 'job_application':
      return { icon: Award, tone: 'amber', label: 'Jobs' };
    case 'endorsement':
    case 'skill_endorsement':
      return { icon: Star, tone: 'amber', label: 'Endorsement' };
    case 'post_share':
      return { icon: Share2, tone: 'sky', label: 'Share' };
    case 'group_invite':
      return { icon: User, tone: 'violet', label: 'Community' };
    case 'event_reminder':
      return { icon: Calendar, tone: 'indigo', label: 'Event' };
    case 'course_enrollment':
    case 'certification_earned':
    case 'achievement_unlocked':
      return { icon: BookOpen, tone: 'teal', label: 'Achievement' };
    default:
      return { icon: Bell, tone: 'slate', label: 'Update' };
  }
}

export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

export function formatFullDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
