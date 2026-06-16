import { ArrowUpRight } from 'lucide-react';
import {
  normalizeHashtagTag,
  resolveActivityLabel,
  resolveTrendIndicator,
} from '@/lib/trendingWidgetUtils';

export default function TrendingHashtagCard({ hashtag, rank, maxCount, onClick }) {
  const tag = normalizeHashtagTag(hashtag.tag);
  const indicator = resolveTrendIndicator(hashtag.count, maxCount, rank);
  const activity = resolveActivityLabel(hashtag.count, maxCount);
  const IndicatorIcon = indicator.Icon;

  return (
    <button type="button" onClick={onClick} className="trending-hashtag-card">
      <span className="trending-hashtag-card__rank" aria-hidden>
        {rank + 1}
      </span>

      <span className="trending-hashtag-card__body">
        <span className="trending-hashtag-card__title-row">
          <span className="trending-hashtag-card__hash">#{tag}</span>
          <span className={`trending-hashtag-card__badge trending-hashtag-card__badge--${rank === 0 ? 'hot' : rank <= 2 ? 'rising' : 'active'}`}>
            <IndicatorIcon className="h-3 w-3" aria-hidden />
            {indicator.label}
          </span>
        </span>
        <span className="trending-hashtag-card__activity">{activity}</span>
      </span>

      <ArrowUpRight className="trending-hashtag-card__arrow" aria-hidden />
    </button>
  );
}
