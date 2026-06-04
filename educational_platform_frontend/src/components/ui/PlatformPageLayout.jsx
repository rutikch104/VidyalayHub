import { cn } from '@/lib/utils';

/**
 * Standard page shell — matches Header (max-w 1440px) and Homepage content rhythm.
 * @param {'default' | 'narrow' | 'readable'} width
 *   - default: full app content width (1440px)
 *   - narrow: focused lists (1152px / max-w-6xl)
 *   - readable: forms & long prose (896px / max-w-4xl)
 */
export default function PlatformPageLayout({
  children,
  width = 'default',
  className,
  containerClassName,
}) {
  const widthClass =
    width === 'narrow'
      ? 'platform-page__container--narrow'
      : width === 'readable'
        ? 'platform-page__container--readable'
        : '';

  return (
    <div className={cn('platform-page', className)}>
      <div className={cn('platform-page__container', widthClass, containerClassName)}>
        {children}
      </div>
    </div>
  );
}
