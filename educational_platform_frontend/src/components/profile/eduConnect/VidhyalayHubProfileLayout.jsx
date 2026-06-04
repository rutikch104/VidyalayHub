import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
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
import { ProfileUnifiedOverview } from '@/components/profile/eduConnect/ProfileOverviewSections';
import {
  pp,
  ProfileHero,
  ProfileTabNav,
  ProfileInsightSidebar,
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
  onEditEducation,
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

  const studentTabs = ['Overview', 'Activity', 'Media', 'Projects', 'Courses'];
  const teacherTabs = ['Overview', 'Activity', 'Media', 'Projects', 'Publications'];
  const alumniTabs = ['Overview', 'Activity', 'Media', 'Projects'];
  const tabs =
    userRole === 'Teacher' ? teacherTabs
      : userRole === 'Alumni' ? alumniTabs
        : studentTabs;

  const skills = profileData?.professionalInfo?.skills || [];
  const skillsDetailed = profileData?.professionalInfo?.skillsDetailed || [];
  const certs = profileData?.professionalInfo?.certifications || [];
  const educationList = profileData?.educationList || [];

  const stats = profileData?.stats || { posts: 0, followers: 0, following: 0, connections: 0, likes: 0 };
  const completion = profileData?.profileCompletion ?? 0;
  const socialLinks = profileData?.socialLinks || {};
  const canEdit = !visitorMode;

  const mediaPosts = useMemo(
    () =>
      (userPosts || []).filter((p) => {
        const urls = p.media_urls || p.images || [];
        return Array.isArray(urls) && urls.length > 0;
      }),
    [userPosts],
  );

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } };

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
            skillTags={[]}
            mutualConnections={mutualConnections}
          />
        </div>

        <div className={pp.contentGrid}>
          <div className={pp.mainColumn}>
            <ProfileTabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <div key={activeTab} className={pp.tabPanel}>
              {activeTab === 'Overview' && (
                <motion.div className="space-y-4" variants={stagger} initial="hidden" animate="show">
                  <ProfileUnifiedOverview
                    userRole={userRole}
                    profileData={profileData}
                    canEdit={canEdit}
                    fadeUp={fadeUp}
                    educationList={educationList}
                    skillsDetailed={skillsDetailed}
                    skills={skills}
                    certs={certs}
                    onEditAbout={onEditAbout}
                    onEditSkills={onEditSkills}
                    onEditExperience={onEditExperience}
                    onEditEducation={onEditEducation}
                    onEditTeaching={onEditTeaching}
                    onEditProfile={onEditProfile}
                  />
                </motion.div>
              )}

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

              {activeTab === 'Publications' && userRole === 'Teacher' && (
                <PublicationsSection
                  publications={userPublications}
                  onEdit={visitorMode ? undefined : onEditPublications}
                />
              )}

              {activeTab === 'Courses' && userRole === 'Student' && (
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
