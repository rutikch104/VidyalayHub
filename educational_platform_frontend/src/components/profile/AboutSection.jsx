import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { profileDesign } from '@/components/profile/profileStyles';
import { ProfileAboutContent } from '@/components/profile/eduConnect/ProfileAboutSkills';

export default function AboutSection({ profileData, onEdit }) {
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
              <p className={profileDesign.sectionSubtitle}>Your introduction on the platform</p>
            </div>
          </div>
          {onEdit ? (
            <button type="button" onClick={onEdit} className={profileDesign.btnOutlineSm}>
              Edit
            </button>
          ) : null}
        </div>

        <ProfileAboutContent
          bio={profileData?.bio}
          canEdit={Boolean(onEdit)}
          emptyHint="Add a bio so people know who you are and what you're passionate about."
        />
      </div>
    </section>
  );
}
