import { resolveMediaUrl } from '@/services/postService';

const DEFAULT_AVATAR =
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300';

/**
 * Maps GET /users/:id/public-profile payload to VidhyalayHubProfileLayout shape.
 */
export function mapPublicProfileToLayout(response) {
  if (!response || response.id == null) return null;

  const ut = response.user_type || 'student';
  const safeUt = ut === 'teacher' || ut === 'alumni' ? ut : 'student';
  const avatarSrc =
    resolveMediaUrl(response.avatar_url || '') || response.avatar_url || DEFAULT_AVATAR;
  const coverRaw = response.cover_image_url;
  const coverSrc = coverRaw ? resolveMediaUrl(coverRaw) || coverRaw : '';

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
  const teachingInfo =
    response.teaching_info && typeof response.teaching_info === 'object'
      ? response.teaching_info
      : { subjects: [], experience_years: null, notes: '' };

  const handle =
    response.username ||
    (response.first_name && response.last_name
      ? `${String(response.first_name).toLowerCase()}${String(response.last_name).charAt(0).toLowerCase()}`
      : `user${String(response.id).slice(0, 8)}`);

  return {
    id: response.id,
    first_name: response.first_name || '',
    last_name: response.last_name || '',
    name: response.name || 'User',
    title:
      response.title ||
      (safeUt === 'teacher' ? 'Teacher' : safeUt === 'alumni' ? 'Alumni' : 'Student'),
    userType: safeUt,
    phone: response.phone || response.phone_number || '',
    email: response.email || '',
    show_email: !!response.show_email,
    show_phone: !!response.show_phone,
    avatar: avatarSrc,
    coverImage: coverSrc,
    location: response.location || '',
    headline: response.headline || '',
    bio: bioText,
    teachingInfo,
    joinedAt: response.created_at || null,
    handle,
    tenant_name: response.tenant_name || '',
    stats: {
      posts: response.posts_count || 0,
      followers: response.connections_count ?? response.followers_count ?? 0,
      following: response.connections_count ?? response.following_count ?? 0,
      likes: response.likes_count || 0,
      connections: response.connections_count ?? 0,
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
      university: response.university || response.tenant_name || undefined,
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
    is_verified: response.is_verified || false,
    profileCompletion: response.profile_completion ?? 0,
    connection_status: response.connection_status,
    connection_id: response.connection_id,
  };
}

/** Keep only posts authored by profileUserId (client safety net). */
export function filterPostsByAuthor(posts, profileUserId) {
  if (!profileUserId || !Array.isArray(posts)) return [];
  const pid = String(profileUserId);
  return posts.filter((p) => {
    const authorId = p?.user?.id ?? p?.user_id;
    return authorId != null && String(authorId) === pid;
  });
}
