import {
  Archive,
  LogOut,
  Megaphone,
  MessageSquare,
  Send,
  Trash2,
  UserMinus,
  Users,
  X,
} from 'lucide-react';

/** Shared tone + icon presets for platform confirmation dialogs (Lovable-style copy). */
export const CONFIRM_ACTION_PRESETS = {
  removeConnection: {
    title: 'Remove connection?',
    description:
      'You will no longer appear in each other\'s network and may need to send a new connection request in the future.',
    confirmLabel: 'Remove connection',
    tone: 'danger',
    icon: UserMinus,
  },
  ignoreInvitation: {
    title: 'Ignore invitation?',
    description:
      'The sender will not be notified. You can still connect later from their profile.',
    confirmLabel: 'Ignore invitation',
    tone: 'danger',
    icon: X,
  },
  withdrawRequest: {
    title: 'Withdraw request?',
    description: 'This pending connection request will be cancelled and removed from your sent list.',
    confirmLabel: 'Withdraw request',
    tone: 'warning',
    icon: Send,
  },
  unfollow: {
    title: 'Unfollow user?',
    description: 'You will stop receiving updates and activity from this user in your feed.',
    confirmLabel: 'Unfollow',
    tone: 'danger',
    icon: UserMinus,
  },
  deletePost: {
    title: 'Delete post?',
    description: 'This action cannot be undone. Comments and likes will be permanently removed.',
    confirmLabel: 'Delete post',
    tone: 'danger',
    icon: Trash2,
  },
  deleteComment: {
    title: 'Delete comment?',
    description: 'This comment will be permanently removed and cannot be recovered.',
    confirmLabel: 'Delete comment',
    tone: 'danger',
    icon: MessageSquare,
  },
  removeAmplify: {
    title: 'Remove your amplify?',
    description:
      'Your amplify will be removed from this post and the amplify count will be updated.',
    confirmLabel: 'Remove amplify',
    tone: 'warning',
    icon: Megaphone,
  },
  removeBookmark: {
    title: 'Remove bookmark?',
    description:
      'This item will be removed from your saved bookmarks. You can save it again anytime.',
    confirmLabel: 'Remove bookmark',
    tone: 'danger',
    icon: Trash2,
  },
  signOut: {
    title: 'Sign out?',
    description: 'You will need to sign in again to access your account and continue where you left off.',
    confirmLabel: 'Sign out',
    tone: 'info',
    icon: LogOut,
  },
  leaveCommunity: {
    title: 'Leave community?',
    description: 'You will lose access to community posts and discussions until you join again.',
    confirmLabel: 'Leave community',
    tone: 'warning',
    icon: Users,
  },
  archiveItem: {
    title: 'Archive this item?',
    description: 'This item will be hidden from active views. You can restore it later if needed.',
    confirmLabel: 'Archive',
    tone: 'warning',
    icon: Archive,
  },
  deleteEvent: {
    title: 'Delete event?',
    description: 'This event will be permanently removed. Registrations and details cannot be recovered.',
    confirmLabel: 'Delete event',
    tone: 'danger',
    icon: Trash2,
  },
  deleteAccount: {
    title: 'Delete your account?',
    description: 'This action is permanent. Your profile, posts, and all associated data will be removed.',
    confirmLabel: 'Delete account',
    tone: 'danger',
    icon: Trash2,
  },
  reportPost: {
    title: 'Report this post?',
    description: 'Our moderation team will review this post. False reports may affect your account standing.',
    confirmLabel: 'Submit report',
    tone: 'warning',
    icon: MessageSquare,
  },
};
