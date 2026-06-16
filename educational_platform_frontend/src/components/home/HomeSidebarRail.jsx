import RightSidebar from '@/components/RightSidebar';

/** Homepage right rail wrapper — profile + widgets column. */
export default function HomeSidebarRail({ onNavigate }) {
  return (
    <aside className="home-layout__rail" aria-label="Sidebar">
      <div className="home-layout__rail-inner">
        <RightSidebar onNavigate={onNavigate} />
      </div>
    </aside>
  );
}
