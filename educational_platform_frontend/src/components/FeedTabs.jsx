import { useCallback, useRef } from 'react';
import { Sparkles, Users, TrendingUp, Network } from 'lucide-react';
import PlatformTabs from '@/components/ui/PlatformTabs';

const TABS = [
  { id: 'for-you', label: 'For You', icon: Sparkles },
  { id: 'following', label: 'Following', icon: Users },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'network', label: 'Network', icon: Network },
];

export default function FeedTabs({ activeTab, onTabChange }) {
  const scrollRef = useRef(null);

  const scrollActiveIntoView = useCallback((tabId) => {
    const el = scrollRef.current?.querySelector(`[data-tab-id="${tabId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  const handleChange = (tabId) => {
    onTabChange(tabId);
    scrollActiveIntoView(tabId);
  };

  return (
    <div className="home-feed-tabs" ref={scrollRef}>
      <PlatformTabs
        tabs={TABS}
        activeKey={activeTab}
        onChange={handleChange}
        ariaLabel="Feed"
        shell
        shellClassName="home-feed-tabs__shell"
        className="home-feed-tabs__tabs"
      />
    </div>
  );
}
