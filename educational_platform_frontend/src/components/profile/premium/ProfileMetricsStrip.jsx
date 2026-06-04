import { pp } from '@/components/profile/premium/profileTokens';

export default function ProfileMetricsStrip({ stats, completion = 0 }) {
  const items = [
    { label: 'Posts', value: stats?.posts ?? 0 },
    { label: 'Connections', value: stats?.connections ?? stats?.followers ?? 0 },
    { label: 'Engagement', value: stats?.likes ?? 0 },
    { label: 'Profile', value: `${Math.min(100, completion)}%`, isPercent: true },
  ];

  return (
    <div className={pp.metricStrip} role="list">
      {items.map((item) => (
        <div key={item.label} className={pp.metricItem} role="listitem">
          <span className={pp.metricValue}>
            {item.isPercent ? item.value : Number(item.value).toLocaleString()}
          </span>
          <span className={pp.metricLabel}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
