import { cn } from '@/lib/utils';

export default function ProfileSectionNav({ visibility, className }) {
  const v = visibility || {};
  const links = [{ id: 'profile-about', label: 'About' }];
  if (v.teaching) links.push({ id: 'profile-teaching', label: 'Teaching' });
  if (v.academic) links.push({ id: 'profile-academic', label: 'Academic' });
  links.push({ id: 'profile-projects', label: 'Projects' });
  if (v.experience) links.push({ id: 'profile-experience', label: 'Experience' });
  if (v.education) links.push({ id: 'profile-education', label: 'Education' });
  if (v.skills) links.push({ id: 'profile-skills', label: 'Skills' });
  if (v.certifications) links.push({ id: 'profile-certifications', label: 'Certs' });
  if (v.accomplishments) links.push({ id: 'profile-accomplishments', label: 'Wins' });
  links.push({ id: 'profile-activity-preview', label: 'Activity' });

  return (
    <nav
      className={cn(
        'sticky top-[3.75rem] z-20 -mx-4 mb-2 border-b border-[#e5e7eb] bg-[#f8f9fa]/95 px-4 py-2 backdrop-blur-md dark:border-border dark:bg-background/95 sm:-mx-6 sm:px-6 lg:top-20 xl:static xl:mb-6 xl:rounded-xl xl:border xl:bg-white xl:px-3 xl:py-2 xl:shadow-sm dark:xl:bg-card',
        className,
      )}
      aria-label="Profile sections"
    >
      <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <a
          href="#profile-top"
          className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#6b7280] transition-colors duration-200 hover:bg-white hover:text-[#3b82f6] dark:hover:bg-muted"
        >
          Top
        </a>
        {links.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#6b7280] transition-colors duration-200 hover:bg-white hover:text-[#3b82f6] dark:hover:bg-muted"
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
