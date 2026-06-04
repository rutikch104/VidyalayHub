/**
 * Profile page design system — spacing scale only: 8 / 12 / 16 / 24 / 32 (Tailwind 2–8)
 * Typography: title (bold) / subtitle (medium) / body (regular)
 * Single accent: primary. Text: neutral-700/800, never pure black.
 */
export const profileDesign = {
  pageBg: 'min-h-[calc(100vh-3.75rem)] scroll-smooth bg-neutral-50 pb-8 dark:bg-background',
  /** Horizontal padding 16–24px; vertical 32px */
  container: 'mx-auto w-full max-w-3xl px-4 py-8 sm:px-6',
  /** 24px between major sections */
  stack: 'flex flex-col gap-6',

  /**
   * Profile header: main content block under the cover — reads as a nested card (LinkedIn-style).
   * Spacing: px-4 mobile / px-6 desktop; pt-6 & pb-6; avatar negative margin compensates for pt-6.
   */
  headerBody: [
    'relative isolate z-[1]',
    'rounded-b-xl border border-neutral-200 border-t-neutral-100 bg-white',
    'px-4 pt-6 pb-6 sm:px-6',
    'shadow-sm transition-all duration-200 ease-out',
    'hover:shadow-md dark:border-border dark:border-t-border/60 dark:bg-card',
  ].join(' '),

  /** Outer card: 12px radius, 24px padding, border + soft shadow */
  card: [
    'rounded-xl border border-neutral-200/90 bg-white p-6 shadow-sm',
    'transition-all duration-200 ease-out',
    'dark:border-border dark:bg-card dark:shadow-none',
  ].join(' '),
  cardHover: 'hover:border-neutral-300/90 hover:shadow-md dark:hover:border-border',

  /** Section title (h2) — bold, consistent size */
  sectionTitle: 'text-base font-bold tracking-tight text-neutral-800 dark:text-foreground',
  /** Subtitle under section title — medium weight */
  sectionSubtitle: 'mt-1 text-sm font-medium text-neutral-500 dark:text-muted-foreground',
  /** Body copy */
  body: 'text-sm font-normal leading-relaxed text-neutral-600 dark:text-muted-foreground',
  /** Meta / caption */
  caption: 'text-xs font-medium uppercase tracking-wide text-neutral-500',

  /** Icon box for section headers — single accent */
  sectionIconBox:
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary',

  /** Section header row: icon + titles + optional action */
  sectionHeader: 'mb-6 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between',
  sectionHeaderLeft: 'flex min-w-0 items-start gap-3',

  /** Primary / secondary / ghost buttons — 200ms */
  btnPrimary:
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow active:scale-[0.98]',
  btnSecondary:
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98] dark:border-border dark:bg-background dark:hover:bg-muted',
  btnOutlineSm:
    'inline-flex shrink-0 items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition-all duration-200 hover:border-primary/35 hover:bg-neutral-50 dark:border-border dark:text-foreground dark:hover:bg-muted',

  /** Empty state dashed panel */
  emptyState:
    'rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 px-6 py-12 text-center dark:border-border dark:bg-muted/15',

  /** Inner nested card (projects grid items) */
  innerCard:
    'flex flex-col rounded-xl border border-neutral-200/90 bg-white p-6 shadow-sm transition-all duration-200 hover:border-primary/25 hover:shadow-md dark:border-border dark:bg-card/50 dark:hover:bg-card',

  /** Post preview wrapper around feed PostCard */
  postPreviewShell: 'overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50/40 dark:border-border/60 dark:bg-muted/10',
};
