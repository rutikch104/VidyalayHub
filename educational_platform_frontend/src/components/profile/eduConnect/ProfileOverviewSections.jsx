import { Briefcase, FileText, GraduationCap, Star, BookOpen, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { EduSectionCard } from '@/components/profile/eduConnect/primitives';
import { ProfileAboutContent, ProfileSkillsSectionBody } from '@/components/profile/eduConnect/ProfileAboutSkills';
import {
  ProfileEditAction,
  ProfileTeachingGrid,
  ProfileSubjectBadges,
  ProfileSubsection,
  ProfileCertList,
} from '@/components/profile/eduConnect/profileLayoutParts';
import {
  ProfileExperienceTimeline,
  ProfileEducationSectionBody,
} from '@/components/profile/premium';
import ProfileEmptyState from '@/components/profile/premium/ProfileEmptyState';

const ABOUT_HINTS = {
  Student: 'Share a short introduction about your goals, interests, and what you\'re working toward.',
  Teacher: 'Introduce yourself — your teaching focus, research interests, or professional background.',
  Alumni: 'Tell your story — career highlights, passions, and what you\'re focused on today.',
};

const EXPERIENCE_HINTS = {
  Student: 'Add internships, part-time roles, or projects you\'ve worked on.',
  Teacher: 'Add your professional roles, research positions, and industry experience.',
  Alumni: 'Add the roles you\'ve held since graduating.',
};

function SectionWrap({ variants, children }) {
  return <motion.div variants={variants}>{children}</motion.div>;
}

export function ProfileOverviewAbout({
  variants,
  bio,
  canEdit,
  userRole,
  onEditAbout,
}) {
  return (
    <SectionWrap variants={variants}>
      <EduSectionCard
        icon={FileText}
        color="indigo"
        title="About"
        action={<ProfileEditAction onClick={canEdit ? onEditAbout : null} />}
      >
        <ProfileAboutContent
          bio={bio}
          canEdit={canEdit}
          emptyHint={ABOUT_HINTS[userRole] || ABOUT_HINTS.Student}
        />
      </EduSectionCard>
    </SectionWrap>
  );
}

export function ProfileOverviewSkills({
  variants,
  skillsDetailed,
  skills,
  canEdit,
  onEditSkills,
}) {
  return (
    <SectionWrap variants={variants}>
      <EduSectionCard
        icon={Star}
        color="violet"
        title="Skills"
        action={<ProfileEditAction onClick={canEdit ? onEditSkills : null} />}
      >
        <ProfileSkillsSectionBody
          skillsDetailed={skillsDetailed}
          skills={skills}
          canEdit={canEdit}
          onEditSkills={onEditSkills}
        />
      </EduSectionCard>
    </SectionWrap>
  );
}

export function ProfileOverviewExperience({
  variants,
  experienceList = [],
  canEdit,
  onEditExperience,
  userRole,
}) {
  const list = Array.isArray(experienceList) ? experienceList : [];
  const openEdit = canEdit ? onEditExperience : null;

  return (
    <SectionWrap variants={variants}>
      <EduSectionCard
        icon={Briefcase}
        color="indigo"
        title="Experience"
        action={<ProfileEditAction onClick={openEdit} />}
      >
        {list.length > 0 ? (
          <ProfileExperienceTimeline items={list} />
        ) : (
          <ProfileEmptyState
            icon={Briefcase}
            title="No experience yet"
            description={
              canEdit
                ? (EXPERIENCE_HINTS[userRole] || EXPERIENCE_HINTS.Student)
                : 'No experience listed yet.'
            }
            action={
              openEdit ? (
                <button type="button" className="app-btn-primary text-sm" onClick={openEdit}>
                  Add experience
                </button>
              ) : null
            }
          />
        )}
      </EduSectionCard>
    </SectionWrap>
  );
}

export function ProfileOverviewEducation({
  variants,
  educationList = [],
  canEdit,
  onEditEducation,
}) {
  return (
    <SectionWrap variants={variants}>
      <EduSectionCard
        icon={GraduationCap}
        color="emerald"
        title="Education"
        action={<ProfileEditAction onClick={canEdit ? onEditEducation : null} />}
      >
        <ProfileEducationSectionBody
          educationList={educationList}
          canEdit={canEdit}
          onEditEducation={onEditEducation}
        />
      </EduSectionCard>
    </SectionWrap>
  );
}

export function ProfileOverviewTeaching({
  variants,
  profileData,
  canEdit,
  onEditTeaching,
}) {
  const ti = profileData?.teachingInfo || {};
  const subjects = Array.isArray(ti.subjects) ? ti.subjects : [];
  const gridItems = [
    { label: 'Department', value: profileData?.academicInfo?.department || profileData?.professionalInfo?.company },
    { label: 'Designation', value: profileData?.professionalInfo?.position || profileData?.title },
    {
      label: 'Years teaching',
      value: ti.experience_years != null ? `${ti.experience_years}+ years` : null,
    },
  ].filter((item) => item.value != null && item.value !== '');

  const hasContent = gridItems.length > 0 || subjects.length > 0 || (ti.notes && ti.notes.trim());

  return (
    <SectionWrap variants={variants}>
      <EduSectionCard
        icon={BookOpen}
        color="sky"
        title="Teaching information"
        action={<ProfileEditAction onClick={canEdit ? onEditTeaching : null} />}
      >
        {hasContent ? (
          <>
            {gridItems.length > 0 ? <ProfileTeachingGrid items={gridItems} /> : null}
            {subjects.length > 0 ? (
              <ProfileSubsection title="Subject expertise">
                <ProfileSubjectBadges subjects={subjects} />
              </ProfileSubsection>
            ) : null}
            {ti.notes?.trim() ? (
              <ProfileSubsection title="Teaching notes">
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{ti.notes}</p>
              </ProfileSubsection>
            ) : null}
          </>
        ) : (
          <ProfileEmptyState
            icon={BookOpen}
            title="No teaching information yet"
            description={
              canEdit
                ? 'Add your department, subjects taught, and years of teaching experience.'
                : 'No teaching information listed yet.'
            }
            action={
              canEdit && onEditTeaching ? (
                <button type="button" className="app-btn-primary text-sm" onClick={onEditTeaching}>
                  Add teaching info
                </button>
              ) : null
            }
          />
        )}
      </EduSectionCard>
    </SectionWrap>
  );
}

export function ProfileOverviewCertifications({ variants, certs = [] }) {
  if (!certs.length) return null;
  return (
    <SectionWrap variants={variants}>
      <EduSectionCard icon={Award} color="amber" title="Certifications">
        <ProfileCertList certs={certs} />
      </EduSectionCard>
    </SectionWrap>
  );
}

/**
 * Unified overview: About → Skills → Experience → Education (+ role-specific sections).
 */
export function ProfileUnifiedOverview({
  userRole,
  profileData,
  canEdit,
  fadeUp,
  educationList,
  skillsDetailed,
  skills,
  certs,
  onEditAbout,
  onEditSkills,
  onEditExperience,
  onEditEducation,
  onEditTeaching,
  onEditProfile,
}) {
  const openAbout = canEdit ? () => (onEditAbout || onEditProfile)?.() : null;
  const openSkills = canEdit ? () => (onEditSkills || onEditProfile)?.() : null;
  const openExperience = canEdit ? () => (onEditExperience || onEditProfile)?.() : null;
  const openEducation = canEdit ? () => (onEditEducation || onEditProfile)?.() : null;
  const openTeaching = canEdit ? () => onEditTeaching?.() : null;

  return (
    <>
      <ProfileOverviewAbout
        variants={fadeUp}
        bio={profileData?.bio}
        canEdit={canEdit}
        userRole={userRole}
        onEditAbout={openAbout}
      />
      <ProfileOverviewSkills
        variants={fadeUp}
        skillsDetailed={skillsDetailed}
        skills={skills}
        canEdit={canEdit}
        onEditSkills={openSkills}
      />
      <ProfileOverviewExperience
        variants={fadeUp}
        experienceList={profileData?.professionalInfo?.experienceList}
        canEdit={canEdit}
        onEditExperience={openExperience}
        userRole={userRole}
      />
      <ProfileOverviewEducation
        variants={fadeUp}
        educationList={educationList}
        canEdit={canEdit}
        onEditEducation={openEducation}
      />
      {userRole === 'Teacher' ? (
        <ProfileOverviewTeaching
          variants={fadeUp}
          profileData={profileData}
          canEdit={canEdit}
          onEditTeaching={openTeaching}
        />
      ) : null}
      <ProfileOverviewCertifications variants={fadeUp} certs={certs} />
    </>
  );
}
