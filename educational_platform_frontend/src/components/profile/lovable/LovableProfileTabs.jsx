import {
  LayoutDashboard,
  Activity,
  Image,
  Code2,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import PlatformTabs from '@/components/ui/PlatformTabs';

const TAB_VALUE = {
  Overview: 'overview',
  Activity: 'activity',
  Media: 'media',
  Projects: 'projects',
  Publications: 'publications',
  Courses: 'courses',
};

const TAB_ICONS = {
  Overview: LayoutDashboard,
  Activity: Activity,
  Media: Image,
  Projects: Code2,
  Publications: BookOpen,
  Courses: GraduationCap,
};

export function tabLabelToValue(label) {
  return TAB_VALUE[label] || String(label).toLowerCase();
}

export function tabValueToLabel(value, tabs) {
  const found = tabs.find((t) => tabLabelToValue(t) === value);
  return found || tabs[0];
}

export default function LovableProfileTabs({ tabs, activeTab, onChange }) {
  const activeValue = tabLabelToValue(activeTab);

  const platformTabs = tabs.map((label) => ({
    key: tabLabelToValue(label),
    label,
    icon: TAB_ICONS[label],
  }));

  return (
    <div className="profile-feed-tabs sticky top-[3.75rem] z-20 mb-4 w-full min-w-0">
      <PlatformTabs
        tabs={platformTabs}
        activeKey={activeValue}
        onChange={(v) => onChange(tabValueToLabel(v, tabs))}
        ariaLabel="Profile sections"
        shell
        shellClassName="profile-feed-tabs__shell"
        className="profile-feed-tabs__tabs"
      />
    </div>
  );
}
