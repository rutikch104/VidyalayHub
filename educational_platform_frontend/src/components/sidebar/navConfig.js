import {
  Home,
  User as UserIcon,
  BookOpen,
  MessageSquare,
  Bell,
  Users,
  Bookmark,
  Briefcase,
  Calendar,
  Settings,
  Network,
  Mic,
  Bot,
  GraduationCap,
  Globe,
  Crown,
  Shield as ShieldIcon,
} from 'lucide-react';
import { PLATFORM_BRAND } from '@/lib/platformBranding';

/** @typedef {{ icon: import('lucide-react').LucideIcon, label: string, page: string, badge?: number, isNew?: boolean, description?: string }} NavItem */

/** @typedef {{ id: string, label: string, items: NavItem[] }} NavGroup */

export function isNavPageActive(currentPage, page) {
  if (page === 'profile') {
    return currentPage === 'profile' || currentPage === 'profile-activity';
  }
  return currentPage === page;
}

/**
 * @param {{ messagesBadge?: number, notificationsBadge?: number, canSeeSuperAdmin?: boolean, canSeeAdmin?: boolean }} opts
 * @returns {NavGroup[]}
 */
export function buildSidebarNavGroups({
  messagesBadge = 0,
  notificationsBadge = 0,
  canSeeSuperAdmin = false,
  canSeeAdmin = false,
}) {
  const mb = typeof messagesBadge === 'number' ? messagesBadge : 0;
  const nb = typeof notificationsBadge === 'number' ? notificationsBadge : 0;

  return [
    {
      id: 'primary',
      label: 'Workspace',
      items: [
        { icon: Home,         label: 'Home',          page: 'home',          description: 'Your feed' },
        { icon: UserIcon,     label: 'Profile',        page: 'profile',       description: 'Your profile' },
        {
          icon: MessageSquare,
          label: 'Messages',
          page: 'messages',
          badge: mb > 0 ? mb : undefined,
          description: 'Direct messages',
        },
        {
          icon: Bell,
          label: 'Notifications',
          page: 'notifications',
          badge: nb > 0 ? nb : undefined,
          description: 'Alerts & mentions',
        },
        { icon: Users,    label: 'Communities', page: 'communities', description: 'Groups & clubs' },
        { icon: Bookmark, label: 'Bookmarks',   page: 'bookmarks',   description: 'Saved items' },
      ],
    },
    {
      id: 'discover',
      label: 'Discover',
      items: [
        { icon: BookOpen,      label: 'Library',         page: 'library',  description: 'Resources & notes' },
        { icon: GraduationCap, label: 'Teacher Central', page: 'teacher',  description: 'Global Q&A across colleges' },
        { icon: Briefcase,     label: 'Jobs',            page: 'jobs',     description: 'Opportunities' },
        { icon: Calendar,      label: 'Events',          page: 'events',   description: 'Campus events' },
        { icon: Network,       label: 'Network',         page: 'network',  description: 'Connections' },
      ],
    },
    {
      id: 'ai',
      label: 'AI Studio',
      items: [
        { icon: Mic,  label: 'AI Interview',  page: 'ai-interview',  isNew: true, description: 'Practice interviews' },
        { icon: Globe,label: 'AI English',    page: 'ai-english',    isNew: true, description: 'Language coaching' },
        { icon: Bot,  label: 'RCPIT ChatGPT', page: 'rcpit-chatgpt', isNew: true, description: 'Campus assistant' },
      ],
    },
    ...(canSeeAdmin || canSeeSuperAdmin
      ? [
          {
            id: 'admin',
            label: 'Administration',
            items: [
              ...(canSeeAdmin
                ? [{ icon: ShieldIcon, label: 'Admin',       page: 'admin',       description: 'College administration' }]
                : []),
              ...(canSeeSuperAdmin
                ? [{ icon: Crown,      label: 'Super Admin', page: 'super-admin', description: 'Platform control' }]
                : []),
            ],
          },
        ]
      : []),
  ];
}

export const SIDEBAR_FOOTER_ITEMS = [
  { icon: Settings, label: 'Settings', page: 'settings', description: 'Account & preferences' },
];

export const SIDEBAR_BRAND = {
  name: PLATFORM_BRAND.name,
  tagline: PLATFORM_BRAND.tagline,
  mark: PLATFORM_BRAND.mark,
};
