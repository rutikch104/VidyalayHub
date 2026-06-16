import { ArrowUpRight, Briefcase } from 'lucide-react';
import { formatSkillActivity } from '@/lib/trendingWidgetUtils';

export default function TrendingSkillCard({ skill, rank, onClick }) {
  return (
    <button type="button" onClick={onClick} className="trending-skill-card">
      <span className="trending-skill-card__icon" aria-hidden>
        <Briefcase className="h-3.5 w-3.5" />
      </span>

      <span className="trending-skill-card__body">
        <span className="trending-skill-card__title">{skill.skill}</span>
        <span className="trending-skill-card__meta">{formatSkillActivity(skill.count)}</span>
      </span>

      <span className="trending-skill-card__rank" aria-hidden>
        #{rank + 1}
      </span>

      <ArrowUpRight className="trending-skill-card__arrow" aria-hidden />
    </button>
  );
}
