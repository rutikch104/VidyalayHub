import PlatformTabs from '@/components/ui/PlatformTabs';

/**
 * Module page tab bar — uses platform-standard Notifications-style tabs.
 * @deprecated theme prop is ignored; all modules share one tab design.
 */
export default function ModuleFeedTabs({
  tabs = [],
  activeKey,
  onChange,
  theme: _theme,
  className,
  shellClassName,
  ariaLabel,
  size,
}) {
  return (
    <PlatformTabs
      tabs={tabs}
      activeKey={activeKey}
      onChange={onChange}
      ariaLabel={ariaLabel}
      shell
      shellClassName={shellClassName}
      className={className}
      size={size}
    />
  );
}
