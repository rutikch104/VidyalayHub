// @ts-nocheck
import {
  Users,
  Compass,
  Star,
  Sparkles,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const METRIC_CONFIG = [
  { key: 'joined', label: 'Joined', icon: Users, tone: 'emerald' },
  { key: 'discover', label: 'Discover', icon: Compass, tone: 'sky' },
  { key: 'featured', label: 'Featured', icon: Star, tone: 'amber' },
  { key: 'posts', label: 'Feed posts', icon: Sparkles, tone: 'violet' },
];

export default function CommunityActivityWidget({
  className,
  joined = 0,
  discoverCount = 0,
  featuredCount = 0,
  feedPostsCount = 0,
}) {
  const values = {
    joined,
    discover: discoverCount,
    featured: featuredCount,
    posts: feedPostsCount,
  };

  return (
    <section className={cn('comm-activity', className)} aria-label="Your community activity">
      <header className="comm-activity__header">
        <span className="comm-activity__header-icon" aria-hidden>
          <Activity className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="comm-activity__title">Your activity</h3>
          <p className="comm-activity__subtitle">Membership & engagement at a glance</p>
        </div>
      </header>

      <dl className="comm-activity__grid">
        {METRIC_CONFIG.map(({ key, label, icon: Icon, tone }) => (
          <div
            key={key}
            className={cn('comm-activity__metric', `comm-activity__metric--${tone}`)}
          >
            <dt className="comm-activity__metric-label">
              <span className={`comm-activity__metric-icon comm-activity__metric-icon--${tone}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              {label}
            </dt>
            <dd className="comm-activity__metric-value">{values[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
