import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Briefcase,
  Star,
  Award,
  FileText,
  BookOpen,
  X,
  ArrowLeft,
  Grid3X3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/services/postService';
import PostsPreview from '@/components/profile/PostsPreview';
import ProjectsSection from '@/components/profile/ProjectsSection';
import PublicationsSection from '@/components/profile/PublicationsSection';
import { EduSectionCard } from '@/components/profile/eduConnect/primitives';
import {
  ProfileEditAction,
  ProfileHashtagTags,
  ProfileTeachingGrid,
  ProfileSubjectBadges,
  ProfileEducationBlock,
  ProfileSubsection,
  ProfileTagGroup,
  ProfileCertList,
  ProfileInstitutionBlock,
  ProfileMiniStatGrid,
} from '@/components/profile/eduConnect/profileLayoutParts';
import {
  pp,
  ProfileHero,
  ProfileTabNav,
  ProfileInsightSidebar,
  ProfileSkillsGrid,
  ProfileExperienceTimeline,
} from '@/components/profile/premium';
import ProfileEmptyState from '@/components/profile/premium/ProfileEmptyState';

export default function VidhyalayHubProfileLayout({
  profileData,
  displayHandle,
  userPosts,
  userProjects,
  userPublications = [],
  postsLoading,
  onEditProfile,
  onEditAbout,
  onEditExperience,
  onEditAchievements,
  onEditSkills,
  onEditTeaching,
  onEditProjects,
  onEditPublications,
  onShareProfile,
  onMessage,
  onAvatarUpload,
  onCoverUpload,
  uploadingAvatar,
  uploadingCover,
  onViewAllPosts,
  onPostDeleted,
  onPostEdited,
  onRefresh,
  refreshing,
  notice,
  onDismissNotice,
  visitorMode = false,
  onBack,
  connectionStatus = 'none',
  onConnect,
  connectBusy = false,
  onNavigate,
  mutualConnections = 0,
}) {
  // Role is always derived from the actual profile user_type — never user-switchable
  const userRole =
    profileData?.userType === 'teacher'
      ? 'Teacher'
      : profileData?.userType === 'alumni'
        ? 'Alumni'
        : 'Student';

  const [activeTab, setActiveTab] = useState('Overview');

  const resolvedHandle =
    displayHandle ||
    (profileData?.handle
      ? `@${profileData.handle}`
      : profileData?.name
        ? `@${String(profileData.name).replace(/\s+/g, '').toLowerCase()}`
        : '');

  // Tab set per role
  const studentTabs  = ['Overview', 'Activity', 'Media', 'Projects', 'Courses'];
  const teacherTabs  = ['Overview', 'Activity', 'Media', 'Projects', 'Publications'];
  const alumniTabs   = ['Overview', 'Activity', 'Media', 'Projects'];
  const tabs =
    userRole === 'Teacher' ? teacherTabs
    : userRole === 'Alumni' ? alumniTabs
    : studentTabs;

  const achievementsFlat = useMemo(() => {
    const a = profileData?.achievements || [];
    return a
      .map((x) => (typeof x === 'string' ? x : x?.title || x?.description || x?.name || ''))
      .filter(Boolean);
  }, [profileData?.achievements]);

  const skills         = profileData?.professionalInfo?.skills         || [];
  const skillsDetailed = profileData?.professionalInfo?.skillsDetailed || [];
  const certs          = profileData?.professionalInfo?.certifications  || [];
  const clubs          = profileData?.clubs  || [];
  const events         = profileData?.events || [];

  const hashtagTags = useMemo(() => {
    const fromSkills = skillsDetailed.length
      ? skillsDetailed.map((s) => s?.name).filter(Boolean)
      : skills.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
    const extra = achievementsFlat.slice(0, 2);
    return [...fromSkills, ...extra]
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 6);
  }, [skills, skillsDetailed, achievementsFlat]);

  const stats      = profileData?.stats || { posts: 0, followers: 0, following: 0, connections: 0, likes: 0 };
  const completion = profileData?.profileCompletion ?? 0;
  const socialLinks = profileData?.socialLinks || {};
  const canEdit     = !visitorMode;

  const mediaPosts = useMemo(
    () =>
      (userPosts || []).filter((p) => {
        const urls = p.media_urls || p.images || [];
        return Array.isArray(urls) && urls.length > 0;
      }),
    [userPosts],
  );

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const fadeUp  = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } };

  /* ── Student Overview ── */
  const StudentOverview = () => (
    <motion.div className="space-y-4" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <EduSectionCard
          icon={FileText}
          color="indigo"
          title="About"
          action={<ProfileEditAction onClick={canEdit ? () => (onEditAbout || onEditProfile)?.() : null} />}
        >
          <p className="text-[0.9375rem] leading-[1.75] text-foreground/80">
            {profileData.bio || (canEdit ? null : 'No bio added yet.')}
          </p>
          {!profileData.bio && canEdit && (
            <p className="text-sm italic text-muted-foreground/60">
              Add a short bio to tell others about your goals and interests.
            </p>
          )}
          <ProfileHashtagTags items={hashtagTags} />
        </EduSectionCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <EduSectionCard icon={GraduationCap} color="emerald" title="Education & campus">
          <ProfileInstitutionBlock
            university={profileData.academicInfo?.university}
            course={profileData.academicInfo?.course}
            graduationYear={profileData.academicInfo?.graduationYear}
          />
          <div className="mt-4">
            <ProfileMiniStatGrid
              items={[
                { label: 'Enrollment', value: profileData.academicInfo?.enrollmentYear },
                { label: 'Semester',   value: profileData.academicInfo?.currentSemester },
                { label: 'GPA',        value: profileData.academicInfo?.gpa },
              ].filter((i) => i.value != null && i.value !== '')}
            />
          </div>
          <ProfileSubsection
            title="Achievements"
            action={<ProfileEditAction onClick={canEdit ? () => (onEditAchievements || onEditProfile)?.() : null} />}
          >
            <ProfileTagGroup items={achievementsFlat} emptyLabel="No achievements listed yet." color="purple" />
          </ProfileSubsection>
          <ProfileSubsection title="Clubs & activities">
            <ProfileTagGroup items={clubs} emptyLabel="No clubs listed yet." color="green" />
          </ProfileSubsection>
          <ProfileSubsection title="Events">
            <ProfileTagGroup items={events} emptyLabel="No events listed yet." color="orange" />
          </ProfileSubsection>
        </EduSectionCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <EduSectionCard
          icon={Briefcase}
          color="indigo"
          title="Experience"
          action={<ProfileEditAction onClick={canEdit ? () => (onEditExperience || onEditProfile)?.() : null} />}
        >
          {(profileData.professionalInfo?.experienceList || []).length > 0 ? (
            <ProfileExperienceTimeline items={profileData.professionalInfo.experienceList} />
          ) : (
            <ProfileEmptyState
              icon={Briefcase}
              title="No experience yet"
              description={canEdit ? 'Add internships, part-time roles, or projects you\'ve worked on.' : 'No experience listed yet.'}
              action={canEdit ? (
                <button
                  type="button"
                  className="app-btn-primary text-sm"
                  onClick={() => (onEditExperience || onEditProfile)?.()}
                >
                  Add experience
                </button>
              ) : null}
            />
          )}
        </EduSectionCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <EduSectionCard
          icon={Star}
          color="violet"
          title="Skills"
          action={<ProfileEditAction onClick={canEdit ? () => (onEditSkills || onEditProfile)?.() : null} />}
        >
          {skillsDetailed.length > 0 || skills.length > 0 ? (
            <ProfileSkillsGrid skillsDetailed={skillsDetailed} skills={skills} />
          ) : (
            <ProfileEmptyState
              icon={Star}
              title="No skills yet"
              description={canEdit ? 'Add skills to highlight your expertise.' : 'No skills listed yet.'}
            />
          )}
        </EduSectionCard>
      </motion.div>

      {certs.length > 0 ? (
        <motion.div variants={fadeUp}>
          <EduSectionCard icon={Award} color="amber" title="Certifications">
            <ProfileCertList certs={certs} />
          </EduSectionCard>
        </motion.div>
      ) : null}
    </motion.div>
  );

  /* ── Teacher Overview ── */
  const TeacherOverview = () => (
    <motion.div className="space-y-4" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <EduSectionCard
          icon={FileText}
          color="indigo"
          title="About"
          action={<ProfileEditAction onClick={canEdit ? () => (onEditAbout || onEditProfile)?.() : null} />}
        >
          <p className="text-[0.9375rem] leading-[1.75] text-foreground/80">
            {profileData.bio || (canEdit ? null : 'No bio added yet.')}
          </p>
          {!profileData.bio && canEdit && (
            <p className="text-sm italic text-muted-foreground/60">
              Add a bio to introduce yourself to others.
            </p>
          )}
          <ProfileHashtagTags items={hashtagTags} />
        </EduSectionCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <EduSectionCard
          icon={BookOpen}
          color="sky"
          title="Teaching information"
          action={<ProfileEditAction onClick={canEdit ? () => onEditTeaching?.() : null} />}
        >
          <ProfileTeachingGrid
            items={[
              { label: 'Department', value: profileData.academicInfo?.department || profileData.professionalInfo?.company },
              { label: 'Position',   value: profileData.professionalInfo?.position || profileData.title },
              {
                label: 'Years teaching',
                value:
                  profileData.teachingInfo?.experience_years != null
                    ? `${profileData.teachingInfo.experience_years}+ years`
                    : null,
              },
            ].filter((item) => item.value != null && item.value !== '')}
          />
          {(profileData.teachingInfo?.subjects || []).length > 0 && (
            <ProfileSubsection title="Subjects taught">
              <ProfileSubjectBadges subjects={profileData.teachingInfo.subjects} />
            </ProfileSubsection>
          )}
          {(skillsDetailed.length > 0 || skills.length > 0) && (
            <ProfileSubsection title="Top skills">
              <ProfileSkillsGrid skillsDetailed={skillsDetailed} skills={skills} />
            </ProfileSubsection>
          )}
        </EduSectionCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <EduSectionCard
          icon={Briefcase}
          color="indigo"
          title="Experience"
          action={<ProfileEditAction onClick={canEdit ? () => (onEditExperience || onEditProfile)?.() : null} />}
        >
          {(profileData.professionalInfo?.experienceList || []).length > 0 ? (
            <ProfileExperienceTimeline items={profileData.professionalInfo.experienceList} />
          ) : (
            <p className="text-sm leading-relaxed text-foreground/80">
              {profileData.professionalInfo?.experience ||
                (canEdit ? 'Add professional experience with Edit.' : 'No experience listed yet.')}
            </p>
          )}
        </EduSectionCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <EduSectionCard icon={GraduationCap} color="emerald" title="Education">
          <ProfileEducationBlock
            degree={profileData.academicInfo?.course || profileData.academicInfo?.degree}
            school={profileData.academicInfo?.university}
            years={
              profileData.academicInfo?.graduationYear
                ? `Class of ${profileData.academicInfo.graduationYear}`
                : null
            }
          />
        </EduSectionCard>
      </motion.div>

      {certs.length > 0 ? (
        <motion.div variants={fadeUp}>
          <EduSectionCard icon={Award} color="amber" title="Certifications">
            <ProfileCertList certs={certs} />
          </EduSectionCard>
        </motion.div>
      ) : null}
    </motion.div>
  );

  /* ── Alumni Overview ── */
  const AlumniOverview = () => (
    <motion.div className="space-y-4" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <EduSectionCard
          icon={FileText}
          color="indigo"
          title="About"
          action={<ProfileEditAction onClick={canEdit ? () => (onEditAbout || onEditProfile)?.() : null} />}
        >
          <p className="text-[0.9375rem] leading-[1.75] text-foreground/80">
            {profileData.bio || (canEdit ? null : 'No bio added yet.')}
          </p>
          {!profileData.bio && canEdit && (
            <p className="text-sm italic text-muted-foreground/60">
              Add a bio to tell others about your journey.
            </p>
          )}
          <ProfileHashtagTags items={hashtagTags} />
        </EduSectionCard>
      </motion.div>

      {/* Experience is the most important section for alumni */}
      <motion.div variants={fadeUp}>
        <EduSectionCard
          icon={Briefcase}
          color="indigo"
          title="Experience"
          action={<ProfileEditAction onClick={canEdit ? () => (onEditExperience || onEditProfile)?.() : null} />}
        >
          {(profileData.professionalInfo?.experienceList || []).length > 0 ? (
            <ProfileExperienceTimeline items={profileData.professionalInfo.experienceList} />
          ) : (
            <ProfileEmptyState
              icon={Briefcase}
              title="No experience yet"
              description={canEdit ? 'Add the roles you\'ve held since graduating.' : 'No experience listed yet.'}
              action={canEdit ? (
                <button
                  type="button"
                  className="app-btn-primary text-sm"
                  onClick={() => (onEditExperience || onEditProfile)?.()}
                >
                  Add experience
                </button>
              ) : null}
            />
          )}
        </EduSectionCard>
      </motion.div>

      {/* Academic history */}
      <motion.div variants={fadeUp}>
        <EduSectionCard icon={GraduationCap} color="emerald" title="Academic history">
          <ProfileEducationBlock
            degree={profileData.academicInfo?.course}
            school={profileData.academicInfo?.university}
            years={
              profileData.academicInfo?.graduationYear
                ? `Class of ${profileData.academicInfo.graduationYear}`
                : null
            }
          />
          {achievementsFlat.length > 0 && (
            <ProfileSubsection
              title="Achievements"
              action={<ProfileEditAction onClick={canEdit ? () => (onEditAchievements || onEditProfile)?.() : null} />}
            >
              <ProfileTagGroup items={achievementsFlat} emptyLabel="No achievements listed yet." color="purple" />
            </ProfileSubsection>
          )}
        </EduSectionCard>
      </motion.div>

      {/* Skills */}
      <motion.div variants={fadeUp}>
        <EduSectionCard
          icon={Star}
          color="violet"
          title="Skills"
          action={<ProfileEditAction onClick={canEdit ? () => (onEditSkills || onEditProfile)?.() : null} />}
        >
          {skillsDetailed.length > 0 || skills.length > 0 ? (
            <ProfileSkillsGrid skillsDetailed={skillsDetailed} skills={skills} />
          ) : (
            <ProfileEmptyState
              icon={Star}
              title="No skills yet"
              description={canEdit ? 'Add your technical and professional skills.' : 'No skills listed yet.'}
            />
          )}
        </EduSectionCard>
      </motion.div>

      {certs.length > 0 ? (
        <motion.div variants={fadeUp}>
          <EduSectionCard icon={Award} color="amber" title="Certifications">
            <ProfileCertList certs={certs} />
          </EduSectionCard>
        </motion.div>
      ) : null}
    </motion.div>
  );

  const OverviewBody = () => {
    if (userRole === 'Teacher') return <TeacherOverview />;
    if (userRole === 'Alumni')  return <AlumniOverview />;
    return <StudentOverview />;
  };

  return (
    <div className={pp.page}>
      <div className={pp.pageGlow} aria-hidden />

      {visitorMode && onBack ? (
        <div className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-xl">
          <div className={cn(pp.container, 'flex items-center gap-3 py-3')}>
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl p-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{profileData?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{resolvedHandle}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={cn(pp.container, pp.animateIn)}>
        {notice ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="min-w-0 flex-1">{notice}</p>
            <button
              type="button"
              onClick={onDismissNotice}
              className="shrink-0 rounded-lg p-1 hover:bg-amber-100/80"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className={pp.heroStatsWrap}>
          <ProfileHero
            profileData={profileData}
            resolvedHandle={resolvedHandle}
            visitorMode={visitorMode}
            /* Pass only the user's actual role — role switcher is hidden when length <= 1 */
            roles={[userRole]}
            activeRole={userRole}
            onRoleChange={undefined}
            onShareProfile={onShareProfile}
            onEditProfile={onEditProfile}
            onCoverUpload={onCoverUpload}
            onAvatarUpload={onAvatarUpload}
            uploadingCover={uploadingCover}
            uploadingAvatar={uploadingAvatar}
            onMessage={onMessage}
            connectionStatus={connectionStatus}
            onConnect={onConnect}
            connectBusy={connectBusy}
            stats={stats}
            skillTags={hashtagTags}
            mutualConnections={mutualConnections}
          />
        </div>

        <div className={pp.contentGrid}>
          <div className={pp.mainColumn}>
            <ProfileTabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <div key={activeTab} className={pp.tabPanel}>
              {activeTab === 'Overview' && <OverviewBody />}

              {activeTab === 'Activity' && (
                <PostsPreview
                  posts={userPosts}
                  loading={postsLoading}
                  onViewAllPosts={visitorMode ? undefined : onViewAllPosts}
                  onPostDeleted={onPostDeleted}
                  onPostEdited={onPostEdited}
                  onNavigate={onNavigate}
                  maxPosts={visitorMode ? null : undefined}
                  hideViewAll={visitorMode}
                  subtitle={visitorMode ? 'Posts by this member' : 'Your recent posts and updates'}
                  emptyHint={visitorMode ? 'This member has not posted yet.' : 'Share an update from the home feed.'}
                />
              )}

              {activeTab === 'Media' && (
                <EduSectionCard icon={Grid3X3} title="Media" subtitle="Photos and videos from posts">
                  {postsLoading ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="premium-profile__skeleton-shimmer aspect-square rounded-2xl" />
                      ))}
                    </div>
                  ) : mediaPosts.length === 0 ? (
                    <ProfileEmptyState
                      icon={Grid3X3}
                      title="No media yet"
                      description="Posts with images or videos will appear in this gallery."
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {mediaPosts.map((post) => {
                        const raw = (post.media_urls || post.images || [])[0];
                        const src =
                          resolveMediaUrl(typeof raw === 'string' ? raw : raw?.url || raw?.storage_key) || raw;
                        return (
                          <button
                            key={post.id}
                            type="button"
                            onClick={() => setActiveTab('Activity')}
                            className={pp.galleryCell}
                          >
                            <img
                              src={src}
                              alt=""
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-foreground/50 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[10px] font-semibold backdrop-blur-sm">
                                View
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </EduSectionCard>
              )}

              {activeTab === 'Projects' && (
                <ProjectsSection projects={userProjects} onEdit={visitorMode ? undefined : onEditProjects} />
              )}

              {activeTab === 'Publications' && (
                <PublicationsSection
                  publications={userPublications}
                  onEdit={visitorMode ? undefined : onEditPublications}
                />
              )}

              {activeTab === 'Courses' && (
                <ProfileEmptyState
                  icon={FileText}
                  title="No courses yet"
                  description="Enrolled courses will appear here when connected to your institution LMS."
                />
              )}
            </div>
          </div>

          <ProfileInsightSidebar
            completion={completion}
            visitorMode={visitorMode}
            socialLinks={socialLinks}
            onBoostProfile={!visitorMode ? onEditProfile : undefined}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  );
}
