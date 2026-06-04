import SidebarSection from './SidebarSection';
import SidebarNavItem from './SidebarNavItem';
import { buildSidebarNavGroups, isNavPageActive } from './navConfig';
import { useSidebar } from './SidebarProvider';

export default function SidebarNav({
  currentPage,
  onNavigate,
  messagesBadge,
  notificationsBadge,
  canSeeSuperAdmin,
  canSeeAdmin,
}) {
  const { collapsed } = useSidebar();

  const groups = buildSidebarNavGroups({
    messagesBadge,
    notificationsBadge,
    canSeeSuperAdmin,
    canSeeAdmin,
  });

  const handleNav = (page) => onNavigate?.(page);

  return (
    <div className="flex flex-col">
      {groups.map((group, index) => (
        <SidebarSection
          key={group.id}
          label={group.label}
          collapsed={collapsed}
          showDivider={index > 0}
        >
          {group.items.map((item) => (
            <SidebarNavItem
              key={item.page}
              {...item}
              active={isNavPageActive(currentPage, item.page)}
              collapsed={collapsed}
              onClick={() => handleNav(item.page)}
            />
          ))}
        </SidebarSection>
      ))}
    </div>
  );
}
