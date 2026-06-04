import { lp } from '@/components/profile/lovable/lovableTokens';

/** Premium profile design tokens — Lovable ProfilePage export */
export const pp = {
  page: `premium-profile premium-profile--page ${lp.page}`,
  pageGlow: 'premium-profile__page-glow pointer-events-none',
  container: lp.container,
  heroStatsWrap: lp.heroStatsWrap,
  animateIn: 'animate-fade-in-up',

  headerCard: 'premium-profile__header-card group',
  cover: 'relative h-48 overflow-hidden sm:h-60 lg:h-72',
  coverWave: 'premium-profile__cover-wave',
  coverImg: 'relative z-[1] h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]',
  coverOverlay: 'absolute inset-0 z-[2] bg-gradient-to-t from-card/85 via-card/15 to-transparent',

  avatarRing: 'rounded-full bg-gradient-primary p-1 shadow-glow',
  avatarBorder: 'border-4 border-card',
  avatarOnline: 'premium-profile__avatar-online',
  roleBadge: 'premium-profile__role-badge',

  glassBtn:
    'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-background/85 text-foreground shadow-sm backdrop-blur-md transition hover:bg-background',

  btnPrimary:
    'inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold bg-gradient-primary text-primary-foreground shadow-md transition-all duration-200 hover:shadow-glow active:scale-[0.98]',
  btnSecondary:
    'inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:bg-muted/50 active:scale-[0.98]',
  btnOutlineIcon:
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-all duration-200 hover:bg-muted/50 active:scale-95',

  tabBar: 'profile-feed-tabs',
  tabShell: 'profile-feed-tabs__shell',
  tabList: 'profile-feed-tabs__tabs',
  tabBarLegacy: 'premium-profile__tab-bar',
  tabScroll: 'premium-profile__tab-scroll',
  tabGrid: 'premium-profile__tab-grid',
  tabTrigger: 'premium-profile__tab-trigger',

  sectionCard: 'premium-profile__section-card',
  sectionHeader: 'premium-profile__section-header',
  sectionBody: 'premium-profile__section-body',
  sectionIconBox: 'premium-profile__section-icon-accent',
  sectionEditBtn: 'premium-profile__section-edit-btn',

  statCard: 'premium-profile__stat-card',
  statGrid: 'mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4',
  statTrend: 'premium-profile__stat-trend',
  statTrendIcon: 'premium-profile__stat-trend-icon',

  sidebarCard: 'premium-profile__sidebar-card',
  sidebarStack: 'space-y-4 lg:sticky lg:top-20 lg:z-10 lg:self-start',

  contentGrid: lp.contentGrid,
  mainColumn: lp.mainColumn,
  tabPanel: lp.tabPanel,

  teachingGrid: 'grid gap-3 sm:grid-cols-3',
  teachingCell: 'premium-profile__teaching-cell',
  subsectionLabel: 'premium-profile__subsection-label',
  bodyText: 'premium-profile__body-text',

  tagRow: 'mt-2 flex flex-wrap gap-2',
  hashtag: 'premium-profile__hashtag',
  subjectBadge: 'premium-profile__subject-badge',
  skillTrack: 'premium-profile__skill-progress-track',
  skillFill: 'premium-profile__skill-progress-fill',

  educationRow: 'flex gap-4',
  institutionCard: 'premium-profile__teaching-cell flex items-center gap-4',
  subsection: 'premium-profile__subsection',

  galleryCell: 'premium-profile__gallery-cell group',
  feedItem: 'premium-profile__feed-item',
  empty: 'premium-profile__empty-state',
  connectBtn: 'premium-profile__connect-btn',
};

export const COVER_GRADIENT =
  'linear-gradient(125deg, hsl(262 72% 56%) 0%, hsl(290 68% 58%) 38%, hsl(220 88% 56%) 72%, hsl(262 65% 52%) 100%)';
