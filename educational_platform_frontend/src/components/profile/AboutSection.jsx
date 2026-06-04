import { User, MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { profileDesign } from '@/components/profile/profileStyles';

export default function AboutSection({ profileData, onEdit }) {
  const hasMeta = Boolean(profileData.location || profileData.socialLinks?.website);

  return (
    <section id="profile-about" className="scroll-mt-24">
      <div className={cn(profileDesign.card, profileDesign.cardHover)}>
        <div className={profileDesign.sectionHeader}>
          <div className={profileDesign.sectionHeaderLeft}>
            <div className={profileDesign.sectionIconBox}>
              <User className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className={profileDesign.sectionTitle}>About</h2>
              <p className={profileDesign.sectionSubtitle}>Introduce yourself to the community</p>
            </div>
          </div>
          {onEdit ? (
            <button type="button" onClick={onEdit} className={profileDesign.btnOutlineSm}>
              Edit
            </button>
          ) : null}
        </div>

        <div className="space-y-4">
          {profileData.bio ? (
            <p className={cn(profileDesign.body, 'whitespace-pre-wrap')}>{profileData.bio}</p>
          ) : (
            <p className="text-sm font-normal italic text-neutral-400 dark:text-muted-foreground">
              Add a bio so people know who you are.
            </p>
          )}
        </div>

        {hasMeta ? (
          <ul className="mt-6 flex flex-col gap-3 border-t border-neutral-100 pt-6 dark:border-border/60">
            {profileData.location ? (
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-muted dark:text-muted-foreground">
                  <MapPin className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className={cn(profileDesign.body, 'pt-1')}>{profileData.location}</span>
              </li>
            ) : null}
            {profileData.socialLinks?.website ? (
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-muted dark:text-muted-foreground">
                  <Globe className="h-4 w-4" strokeWidth={2} />
                </span>
                <a
                  href={profileData.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all pt-1 text-sm font-semibold text-primary transition-colors duration-200 hover:underline"
                >
                  {profileData.socialLinks.website}
                </a>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
