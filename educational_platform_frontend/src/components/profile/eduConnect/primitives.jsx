import { cn } from '@/lib/utils';
import LovableSectionCard, { LovableEditButton } from '@/components/profile/lovable/LovableSectionCard';

const tagColors = {
  blue: 'border-primary/25 bg-primary/10 text-primary',
  green: 'border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  purple: 'border-violet-300/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  orange: 'border-orange-300/40 bg-orange-500/10 text-orange-800 dark:text-orange-300',
};

export function EduTag({ children, color = 'blue' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        tagColors[color] || tagColors.blue,
      )}
    >
      {children}
    </span>
  );
}

/** Lovable ProfilePage SectionCard */
export function EduSectionCard(props) {
  return <LovableSectionCard {...props} />;
}

export function SectionEditButton(props) {
  return <LovableEditButton {...props} />;
}
