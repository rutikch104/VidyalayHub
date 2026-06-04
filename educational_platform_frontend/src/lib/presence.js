/** Presence / availability status tokens */
export const PRESENCE_STATUS = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline',
};

export const PRESENCE_CONFIG = {
  online: {
    label: 'Available',
    dotClass: 'bg-emerald-500',
    ringClass: 'ring-emerald-400/30',
    labelClass: 'text-emerald-700 dark:text-emerald-400',
    chipClass: 'border-emerald-500/25 bg-emerald-500/[0.08]',
  },
  away: {
    label: 'Away',
    dotClass: 'bg-amber-400',
    ringClass: 'ring-amber-400/30',
    labelClass: 'text-amber-700 dark:text-amber-400',
    chipClass: 'border-amber-500/25 bg-amber-500/[0.08]',
  },
  busy: {
    label: 'Busy',
    dotClass: 'bg-rose-500',
    ringClass: 'ring-rose-400/30',
    labelClass: 'text-rose-700 dark:text-rose-400',
    chipClass: 'border-rose-500/25 bg-rose-500/[0.08]',
  },
  offline: {
    label: 'Offline',
    dotClass: 'bg-muted-foreground/50',
    ringClass: 'ring-border/40',
    labelClass: 'text-muted-foreground',
    chipClass: 'border-border/60 bg-muted/40',
  },
};

export const AVATAR_SIZE_CLASSES = {
  xs: {
    box: 'h-7 w-7',
    ring: 'ring-[1.5px] ring-border/70',
    badge: 'sm',
  },
  sm: {
    box: 'h-8 w-8',
    ring: 'ring-2 ring-border/60',
    badge: 'sm',
  },
  comment: {
    box: 'h-9 w-9 sm:h-10 sm:w-10',
    ring: 'ring-1 ring-border/80',
    badge: 'sm',
  },
  md: {
    box: 'h-11 w-11 sm:h-12 sm:w-12',
    ring: 'ring-2 ring-border/60',
    badge: 'md',
  },
  lg: {
    box: 'h-12 w-12',
    ring: 'ring-2 ring-border/60',
    badge: 'md',
  },
  xl: {
    box: 'h-14 w-14',
    ring: 'ring-2 ring-border/60',
    badge: 'lg',
  },
  '2xl': {
    box: 'h-20 w-20',
    ring: 'ring-[3px] ring-card',
    badge: 'lg',
  },
  profile: {
    box: 'h-24 w-24 sm:h-32 sm:w-32',
    ring: 'ring-4 ring-card',
    badge: 'xl',
  },
  hero: {
    box: 'h-28 w-28 sm:h-[7.5rem] sm:w-[7.5rem]',
    ring: 'ring-4 ring-card',
    badge: 'xl',
  },
};

export const BADGE_SIZE_CLASSES = {
  sm: 'h-[10px] w-[10px] border-[2px]',
  md: 'h-3 w-3 border-[2px]',
  lg: 'h-3.5 w-3.5 border-[2.5px]',
  xl: 'h-[18px] w-[18px] border-[3px]',
};
