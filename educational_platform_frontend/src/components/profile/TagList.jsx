import { cn } from '@/lib/utils';

const presets = {
  purple: 'bg-[#f3e8ff] text-[#7c3aed] dark:bg-violet-950/40 dark:text-violet-200',
  blue: 'bg-[#dbeafe] text-[#2563eb] dark:bg-sky-950/40 dark:text-sky-200',
  amber: 'bg-[#fef3c7] text-[#d97706] dark:bg-amber-950/40 dark:text-amber-200',
  green: 'bg-[#dcfce7] text-[#16a34a] dark:bg-emerald-950/40 dark:text-emerald-200',
  indigo: 'bg-[#e0e7ff] text-[#4f46e5] dark:bg-indigo-950/40 dark:text-indigo-200',
  gray: 'bg-[#f3f4f6] text-[#374151] dark:bg-muted dark:text-foreground',
};

export default function TagList({ tags, variant = 'gray', className }) {
  if (!tags?.length) return null;
  const style = presets[variant] || presets.gray;
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tags.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className={cn('rounded-2xl px-3 py-1 text-[13px] font-medium', style)}
        >
          {typeof t === 'string' ? t : t?.name || t?.title || ''}
        </span>
      ))}
    </div>
  );
}
