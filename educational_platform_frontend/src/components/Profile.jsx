// @ts-nocheck
import { useState, useEffect, useMemo, useCallback, Component } from 'react';
import { Camera, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/services/userService';
import { resolveMediaUrl, formatPostFromApi } from '@/services/postService';
import VidhyalayHubProfileLayout from '@/components/profile/eduConnect/VidhyalayHubProfileLayout';
import ProfileSectionEditModals from '@/components/profile/ProfileSectionEditModals';
import { profileDesign } from '@/components/profile/profileStyles';
import ProfileSkeleton from '@/components/profile/premium/ProfileSkeleton';

const DEFAULT_AVATAR =
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300';

class ProfileLayoutErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Profile layout error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
          <div className="app-alert-error max-w-md rounded-xl px-6 py-4 text-center">
            <h3 className="mb-2 text-lg font-semibold">Profile could not be displayed</h3>
            <p className="text-sm">Something went wrong loading the profile layout. Please refresh the page.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="app-btn-primary mt-4 text-sm"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20';

export default function Profile({ onNavigate }) {
  const { user, updateUser } = useAuth();
  const [userType, setUserType] = useState('student');
  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userProjects, setUserProjects] = useState([]);
  const [userPublications, setUserPublications] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [notice, setNotice] = useState('');
  const [editError, setEditError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [sectionModal, setSectionModal] = useState(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    headline: '',
    location: '',
    phone_number: '',
    email: '',
    show_email: false,
    show_phone: false,
    website_url: '',
    linkedin_url: '',
    github_url: '',
    twitter_url: '',
    course: '',
    department: '',
    company: '',
    position: '',
    experience: '',
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    setNotice('');
    try {
      const response = await userService.getCurrentUserProfile();
      if (!response || response.id == null || response.id === '') {
        throw new Error('Invalid profile response');
      }
      const avatarSrc = resolveMediaUrl(response.avatar_url || '') || response.avatar_url || DEFAULT_AVATAR;
      const coverRaw = response.cover_image_url;
      const coverSrc = coverRaw ? resolveMediaUrl(coverRaw) || coverRaw : '';
      const ut = response.user_type || 'student';
      const bioRaw = response.bio;
      const bioText =
        typeof bioRaw === 'string'
          ? bioRaw.trim()
          : bioRaw != null && bioRaw !== ''
            ? String(bioRaw).trim()
            : '';
      const achievementsRaw = response.achievements;
      const achievementsList = Array.isArray(achievementsRaw)
        ? achievementsRaw
        : typeof achievementsRaw === 'string'
          ? (() => {
              try {
                const p = JSON.parse(achievementsRaw);
                return Array.isArray(p) ? p : [];
              } catch {
                return [];
              }
            })()
          : [];
      const experienceList = Array.isArray(response.experience_list) ? response.experience_list : [];
      const educationList = Array.isArray(response.education_list) ? response.education_list : [];
      const skillsDetailed = Array.isArray(response.skills_detailed) ? response.skills_detailed : [];
      const teachingInfo = response.teaching_info && typeof response.teaching_info === 'object'
        ? response.teaching_info
        : { subjects: [], experience_years: null, notes: '' };

      const profile = {
        id: response.id,
        first_name: response.first_name || '',
        last_name: response.last_name || '',
        name: response.name || 'User',
        title:
          response.title ||
          (ut === 'student' ? 'Student' : ut === 'teacher' ? 'Teacher' : ut === 'alumni' ? 'Alumni' : 'User'),
        userType: ut === 'teacher' || ut === 'alumni' ? ut : 'student',
        phone: response.phone || response.phone_number || '',
        email: response.email || user?.email || '',
        show_email: !!response.show_email,
        show_phone: !!response.show_phone,
        avatar: avatarSrc,
        coverImage: coverSrc,
        location: response.location || '',
        headline: response.headline || '',
        bio: bioText,
        teachingInfo,
        joinedAt: response.created_at || response.createdAt || user?.created_at || null,
        stats: {
          posts: response.posts_count || 0,
          followers: response.followers_count || 0,
          following: response.following_count || 0,
          connections: response.connections_count || 0,
          likes: response.likes_count || 0,
        },
        socialLinks: {
          linkedin: response.linkedin_url || undefined,
          twitter: response.twitter_url || undefined,
          github: response.github_url || undefined,
          website: response.website_url || undefined,
        },
        academicInfo: {
          enrollmentYear: response.enrollment_year,
          currentSemester: response.current_semester,
          gpa: response.gpa,
          course: response.course || undefined,
          department: response.department || undefined,
          university: response.university || undefined,
          graduationYear: response.graduation_year,
        },
        professionalInfo: {
          company: response.company || undefined,
          position: response.position || undefined,
          experience: response.experience || undefined,
          experienceList,
          skills: response.skills || [],
          skillsDetailed,
          certifications: response.certifications || [],
        },
        educationList,
        achievements: achievementsList,
        clubs: response.clubs || [],
        events: response.events || [],
        projects: response.projects || [],
        isOnline: true,
        isPro: response.is_premium || false,
        profileCompletion: response.profile_completion ?? 0,
      };
      setProfileData(profile);
      setUserType(profile.userType);
      if (updateUser && user) {
        const nextAvatar = profile.avatar;
        const nextCover = profile.coverImage || undefined;
        if (user.avatar_url !== nextAvatar || user.cover_image_url !== nextCover) {
          updateUser({
            ...user,
            avatar_url: nextAvatar,
            cover_image_url: nextCover,
          });
        }
      }
    } catch (err) {
      console.error('fetchUserProfile:', err);
      // Keep shape identical to the success-path profile so downstream
      // section components don't hit undefined arrays / keys when the
      // API request fails.
      const safeUt =
        user.user_type === 'teacher' || user.user_type === 'alumni' ? user.user_type : 'student';
      const fallbackProfile = {
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        name:
          user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
        title:
          safeUt === 'teacher' ? 'Teacher' : safeUt === 'alumni' ? 'Alumni' : 'Student',
        userType: safeUt,
        phone: '',
        email: user.email || '',
        show_email: false,
        show_phone: false,
        avatar: resolveMediaUrl(user.avatar_url || '') || user.avatar_url || DEFAULT_AVATAR,
        coverImage: resolveMediaUrl(user.cover_image_url || '') || user.cover_image_url || '',
        location: '',
        headline: '',
        bio: '',
        teachingInfo: { subjects: [], experience_years: null, notes: '' },
        joinedAt: null,
        stats: { posts: 0, followers: 0, following: 0, connections: 0, likes: 0 },
        socialLinks: {},
        academicInfo: {},
        professionalInfo: {
          experienceList: [],
          skills: [],
          skillsDetailed: [],
          certifications: [],
        },
        educationList: [],
        achievements: [],
        clubs: [],
        events: [],
        projects: [],
        isOnline: true,
        isPro: false,
        profileCompletion: 0,
      };
      setProfileData(fallbackProfile);
      setUserType(fallbackProfile.userType);
      setNotice('Profile could not be loaded from the server. Showing saved account details.');
    }
  }, [user?.id]);

  const fetchUserPosts = useCallback(async () => {
    if (!user) return;
    try {
      const response = await userService.getUserPosts(user.id, { page: 1, limit: 30 });
      const raw = response.posts || [];
      setUserPosts(
        raw.map((post) => formatPostFromApi(post)).filter(Boolean),
      );
    } catch {
      setUserPosts([]);
    }
  }, [user?.id]);

  const fetchUserProjects = useCallback(async () => {
    if (!user) return;
    try {
      const response = await userService.getUserProjects(user.id);
      const list = Array.isArray(response?.projects)
        ? response.projects
        : Array.isArray(response)
          ? response
          : [];
      const projects = list.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        technologies: project.technologies || [],
        status: project.status || 'Completed',
        image: project.image_url,
        githubUrl: project.github_url,
        liveUrl: project.live_url,
      }));
      setUserProjects(projects);
    } catch {
      setUserProjects([]);
    }
  }, [user?.id]);

  const fetchUserPublications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await userService.getUserPublications(user.id);
      const list = Array.isArray(response?.publications)
        ? response.publications
        : Array.isArray(response)
          ? response
          : [];
      setUserPublications(
        list.map((p) => ({
          id: p.id,
          title: p.title,
          venue: p.venue || '',
          year: p.year || '',
          description: p.description || '',
          url: p.url || '',
        })),
      );
    } catch {
      setUserPublications([]);
    }
  }, [user?.id]);

  const handleProfileSectionsSaved = useCallback(async () => {
    await Promise.all([fetchUserProfile(), fetchUserProjects(), fetchUserPublications()]);
  }, [fetchUserProfile, fetchUserProjects, fetchUserPublications]);

  useEffect(() => {
    if (!user?.id) {
      setInitialLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setInitialLoading(true);
      setNotice('');
      try {
        await fetchUserProfile();
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchUserProfile]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setPostsLoading(true);
    Promise.all([fetchUserPosts(), fetchUserProjects(), fetchUserPublications()]).finally(() => {
      if (!cancelled) setPostsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchUserPosts, fetchUserProjects, fetchUserPublications]);

  const handleFollowClick = () => {
    setNotice('You’re viewing your own profile. Follow others from the network.');
    setTimeout(() => setNotice(''), 3200);
  };

  const handleMessageClick = () => {
    if (onNavigate) onNavigate('messages');
    else setNotice('Open Messages to start a conversation.');
  };

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    setPostsLoading(true);
    try {
      await Promise.all([fetchUserProfile(), fetchUserPosts(), fetchUserProjects(), fetchUserPublications()]);
    } finally {
      setRefreshing(false);
      setPostsLoading(false);
    }
  }, [user, fetchUserProfile, fetchUserPosts, fetchUserProjects, fetchUserPublications]);

  const handlePostDeleted = useCallback((postId) => {
    setUserPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)));
    setProfileData((prev) => {
      if (!prev?.stats) return prev;
      return {
        ...prev,
        stats: { ...prev.stats, posts: Math.max(0, (prev.stats.posts || 0) - 1) },
      };
    });
  }, []);

  const handlePostEdited = useCallback((updated) => {
    setUserPosts((prev) => prev.map((p) => (String(p.id) === String(updated.id) ? { ...p, ...updated } : p)));
  }, []);

  const handleEditProfile = () => {
    if (profileData) {
      setEditError('');
      const nm = profileData.name || '';
      setEditForm({
        first_name: profileData.first_name || nm.split(' ')[0] || '',
        last_name: profileData.last_name || nm.split(' ').slice(1).join(' ') || '',
        headline: profileData.headline || '',
        location: profileData.location || '',
        phone_number: profileData.phone || '',
        email: profileData.email || user?.email || '',
        show_email: !!profileData.show_email,
        show_phone: !!profileData.show_phone,
        website_url: profileData.socialLinks?.website || '',
        linkedin_url: profileData.socialLinks?.linkedin || '',
        github_url: profileData.socialLinks?.github || '',
        twitter_url: profileData.socialLinks?.twitter || '',
        course: profileData.academicInfo?.course || '',
        department: profileData.academicInfo?.department || '',
        company: profileData.professionalInfo?.company || '',
        position: profileData.professionalInfo?.position || '',
        experience: profileData.professionalInfo?.experience || '',
      });
    }
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setEditError('');
    setSavingProfile(true);
    try {
      // Save main profile fields (name, phone, social links, role-specific academic/professional)
      await userService.updateProfile({
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        phone_number: editForm.phone_number.trim() || undefined,
        location: editForm.location.trim() || undefined,
        website_url: editForm.website_url.trim() || undefined,
        linkedin_url: editForm.linkedin_url.trim() || undefined,
        github_url: editForm.github_url.trim() || undefined,
        twitter_url: editForm.twitter_url.trim() || undefined,
        course: editForm.course.trim() || undefined,
        department: editForm.department.trim() || undefined,
        company: editForm.company.trim() || undefined,
        position: editForm.position.trim() || undefined,
        experience: editForm.experience.trim() || undefined,
      });
      // Headline is stored in UserAbout — persist it via the about endpoint
      await userService.updateProfileAbout({
        headline: editForm.headline.trim(),
        location: editForm.location.trim(),
        website: editForm.website_url.trim(),
      });
      await userService.updateUserSettings({
        privacy_settings: {
          show_email: !!editForm.show_email,
          show_phone: !!editForm.show_phone,
        },
      });
      setShowEditModal(false);
      await fetchUserProfile();
      if (updateUser && user) {
        updateUser({
          ...user,
          name: [editForm.first_name.trim(), editForm.last_name.trim()].filter(Boolean).join(' ') || user.name,
          first_name: editForm.first_name.trim() || user.first_name,
          last_name: editForm.last_name.trim() || user.last_name,
        });
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const response = await userService.uploadAvatar(file);
      const url = resolveMediaUrl(response.avatar_url) || response.avatar_url;
      setProfileData((p) => (p ? { ...p, avatar: url } : p));
      if (updateUser && user) updateUser({ ...user, avatar_url: url });
    } catch (err) {
      setEditError(err.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setProfileData((p) => (p ? { ...p, coverImage: previewUrl } : p));
    try {
      setUploadingCover(true);
      const response = await userService.uploadCover(file);
      const url = response.cover_image_url
        ? resolveMediaUrl(response.cover_image_url) || response.cover_image_url
        : '';
      if (!url) throw new Error('Cover upload did not return an image URL');
      setProfileData((p) => (p ? { ...p, coverImage: url } : p));
      if (updateUser && user) updateUser({ ...user, cover_image_url: url });
      setNotice('Cover photo updated.');
      setTimeout(() => setNotice(''), 3200);
    } catch (err) {
      const prev = resolveMediaUrl(user?.cover_image_url || '') || user?.cover_image_url || '';
      setProfileData((p) => (p ? { ...p, coverImage: prev } : p));
      setNotice(err.message || 'Failed to upload cover image');
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploadingCover(false);
      event.target.value = '';
    }
  };

  const handleShareProfile = async () => {
    if (!profileData || typeof window === 'undefined') return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profileData.name} — Profile`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice('Profile link copied to clipboard.');
        setTimeout(() => setNotice(''), 3200);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setNotice('Profile link copied to clipboard.');
        setTimeout(() => setNotice(''), 3200);
      } catch {
        /* ignore */
      }
    }
  };

  const displayHandle = useMemo(() => {
    if (!profileData) return '@user';
    const a = (profileData.first_name || '').toLowerCase().replace(/\s+/g, '');
    const b = (profileData.last_name || '').toLowerCase().replace(/\s+/g, '');
    if (a || b) return `@${a}${b}`;
    return '@user';
  }, [profileData]);

  useEffect(() => {
    if (!showEditModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowEditModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showEditModal]);

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
        <div className="app-alert-error max-w-md rounded-xl px-6 py-4">
          <h3 className="mb-2 text-lg font-semibold">Authentication required</h3>
          <p className="text-sm">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  if (initialLoading) {
    return <ProfileSkeleton />;
  }

  if (!profileData) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
        <div className="app-alert-error max-w-md rounded-xl px-6 py-4 text-center">
          <h3 className="mb-2 text-lg font-semibold">Profile not available</h3>
          <p className="text-sm">Unable to load profile data. Please try refreshing the page.</p>
          <button type="button" onClick={() => window.location.reload()} className="app-btn-primary mt-4 text-sm">
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProfileSectionEditModals
        section={sectionModal}
        profileData={profileData}
        userProjects={userProjects}
        userPublications={userPublications}
        onClose={() => setSectionModal(null)}
        onSaved={handleProfileSectionsSaved}
      />

      <ProfileLayoutErrorBoundary>
      <VidhyalayHubProfileLayout
        profileData={profileData}
        displayHandle={displayHandle}
        userPosts={userPosts}
        userProjects={userProjects}
        userPublications={userPublications}
        postsLoading={postsLoading}
        onEditProfile={handleEditProfile}
        onEditAbout={() => setSectionModal('about')}
        onEditExperience={() => setSectionModal('experience')}
        onEditEducation={() => setSectionModal('education')}
        onEditAchievements={() => setSectionModal('achievements')}
        onEditSkills={() => setSectionModal('skills')}
        onEditProjects={() => setSectionModal('projects')}
        onEditPublications={() => setSectionModal('publications')}
        onEditTeaching={userType === 'teacher' ? () => setSectionModal('teaching') : undefined}
        onShareProfile={handleShareProfile}
        onFollow={handleFollowClick}
        onMessage={handleMessageClick}
        onAvatarUpload={handleAvatarUpload}
        onCoverUpload={handleCoverUpload}
        uploadingAvatar={uploadingAvatar}
        uploadingCover={uploadingCover}
        onViewAllPosts={() => onNavigate?.('profile-activity')}
        onPostDeleted={handlePostDeleted}
        onPostEdited={handlePostEdited}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        notice={notice}
        onDismissNotice={() => setNotice('')}
        onNavigate={onNavigate}
      />
      </ProfileLayoutErrorBoundary>

      {showEditModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setShowEditModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-edit-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-0.5 bg-gradient-to-r from-primary via-primary/60 to-accent/80" />
            <div className="flex items-center justify-between px-6 py-4">
              <h3 id="profile-edit-title" className="text-lg font-semibold tracking-tight text-foreground">
                Edit profile
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-px bg-border/50" />
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={profileData?.avatar}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                    />
                    <label className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                      <Camera className="h-3 w-3" />
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile picture</p>
                    <p className="text-xs text-muted-foreground">Click the camera icon to upload</p>
                  </div>
                </div>

                {/* Basic info */}
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Basic information
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="app-label">First name</label>
                        <input
                          type="text"
                          value={editForm.first_name}
                          onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="app-label">Last name</label>
                        <input
                          type="text"
                          value={editForm.last_name}
                          onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="app-label">Headline</label>
                      <input
                        type="text"
                        value={editForm.headline}
                        onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                        className={inputClass}
                        placeholder={
                          userType === 'teacher'
                            ? 'e.g. Professor of Computer Science'
                            : userType === 'alumni'
                              ? 'e.g. Software Engineer at Google'
                              : 'e.g. Final-year CSE · ML enthusiast'
                        }
                      />
                    </div>
                    <div>
                      <label className="app-label">Location</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className={inputClass}
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                </div>

                {/* Social links */}
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Social links
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="app-label">LinkedIn</label>
                      <input
                        type="url"
                        value={editForm.linkedin_url}
                        onChange={(e) => setEditForm({ ...editForm, linkedin_url: e.target.value })}
                        className={inputClass}
                        placeholder="https://linkedin.com/in/…"
                      />
                    </div>
                    <div>
                      <label className="app-label">GitHub</label>
                      <input
                        type="url"
                        value={editForm.github_url}
                        onChange={(e) => setEditForm({ ...editForm, github_url: e.target.value })}
                        className={inputClass}
                        placeholder="https://github.com/…"
                      />
                    </div>
                    <div>
                      <label className="app-label">Twitter / X</label>
                      <input
                        type="url"
                        value={editForm.twitter_url}
                        onChange={(e) => setEditForm({ ...editForm, twitter_url: e.target.value })}
                        className={inputClass}
                        placeholder="https://twitter.com/…"
                      />
                    </div>
                    <div>
                      <label className="app-label">Website</label>
                      <input
                        type="url"
                        value={editForm.website_url}
                        onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })}
                        className={inputClass}
                        placeholder="https://…"
                      />
                    </div>
                  </div>
                </div>

                {/* Student — academic fields */}
                {userType === 'student' && (
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Academic
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="app-label">Course / Programme</label>
                        <input
                          type="text"
                          value={editForm.course}
                          onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. B.Tech Computer Science"
                        />
                      </div>
                      <div>
                        <label className="app-label">Department</label>
                        <input
                          type="text"
                          value={editForm.department}
                          onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Engineering"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Alumni — current position */}
                {userType === 'alumni' && (
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Current position
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="app-label">Company / Organisation</label>
                        <input
                          type="text"
                          value={editForm.company}
                          onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Google"
                        />
                      </div>
                      <div>
                        <label className="app-label">Position / Role</label>
                        <input
                          type="text"
                          value={editForm.position}
                          onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Software Engineer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Teacher — teaching info note */}
                {userType === 'teacher' && (
                  <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    Update your subjects and teaching experience via the{' '}
                    <span className="font-medium text-foreground">Teaching information</span> section on your profile.
                  </div>
                )}

                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contact information
                  </h4>
                  <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                    Update your contact details and choose whether they appear on your profile card.
                    Edit your bio in the About section.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="app-label" htmlFor="profile-edit-phone">
                        Phone number
                      </label>
                      <input
                        id="profile-edit-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={editForm.phone_number}
                        onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                        className={inputClass}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div>
                      <label className="app-label" htmlFor="profile-edit-email">
                        Email address
                      </label>
                      <input
                        id="profile-edit-email"
                        type="email"
                        value={editForm.email}
                        readOnly
                        className={`${inputClass} cursor-default bg-muted/40 text-muted-foreground`}
                        aria-describedby="profile-edit-email-hint"
                      />
                      <p id="profile-edit-email-hint" className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                        Account email is managed through your sign-in credentials.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/25 px-3.5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">Show phone on profile</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Display your phone number on your public profile card
                        </p>
                      </div>
                      <Switch
                        checked={!!editForm.show_phone}
                        onCheckedChange={(checked) =>
                          setEditForm({ ...editForm, show_phone: checked })
                        }
                        aria-label="Show phone on profile"
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/25 px-3.5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">Show email on profile</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Display your email address on your public profile card
                        </p>
                      </div>
                      <Switch
                        checked={!!editForm.show_email}
                        onCheckedChange={(checked) =>
                          setEditForm({ ...editForm, show_email: checked })
                        }
                        aria-label="Show email on profile"
                      />
                    </div>
                  </div>
                </div>

                {editError ? (
                  <div className="app-alert-error rounded-lg px-4 py-3 text-sm">{editError}</div>
                ) : null}
              </div>
            </div>
            <div className="h-px bg-border/50" />
            <div className="flex items-center justify-end gap-3 px-6 py-4">
              <button type="button" onClick={() => setShowEditModal(false)} className="app-btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={savingProfile}
                className="app-btn-primary"
              >
                {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
