import { Flame, Sparkles, TrendingUp, Zap } from 'lucide-react';

export const TRENDING_HASHTAG_DISPLAY_LIMIT = 5;
export const TRENDING_HASHTAG_FETCH_LIMIT = 7;
export const TRENDING_SKILL_DISPLAY_LIMIT = 3;

const TREND_INDICATORS = {
  hot: { label: 'Hot trend', Icon: Flame },
  rising: { label: 'Rising fast', Icon: TrendingUp },
  popular: { label: 'Popular', Icon: Sparkles },
  active: { label: 'Active buzz', Icon: Zap },
};

export function resolveTrendIndicator(count, maxCount, rank) {
  if (rank === 0) return TREND_INDICATORS.hot;
  if (maxCount > 0 && count >= maxCount * 0.72) return TREND_INDICATORS.rising;
  if (maxCount > 0 && count >= maxCount * 0.42) return TREND_INDICATORS.popular;
  return TREND_INDICATORS.active;
}

export function resolveActivityLabel(count, maxCount) {
  if (maxCount <= 0) return 'Campus conversations';
  const ratio = count / maxCount;
  if (ratio >= 0.85) return 'High community activity';
  if (ratio >= 0.55) return 'Growing discussions';
  if (ratio >= 0.3) return 'Steady campus buzz';
  return 'Emerging conversations';
}

export function formatSkillActivity(count) {
  const n = Number(count) || 0;
  if (n >= 12) return 'High hiring demand';
  if (n >= 6) return 'Strong job interest';
  if (n >= 3) return 'Growing demand';
  return n === 1 ? '1 job mention' : `${n} job mentions`;
}

export function normalizeHashtagTag(tag) {
  return String(tag || '').replace(/^#+/, '').trim();
}
