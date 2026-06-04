import {
  MapPin,
  Share2,
  Edit3,
  Camera,
  MessageCircle,
  UserPlus,
  Linkedin,
  Twitter,
  Github,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { profileDesign } from '@/components/profile/profileStyles';
import UserAvatar from '@/components/ui/UserAvatar';
import { resolveMediaUrl } from '@/services/postService';

const DEFAULT_AVATAR =
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300';

export default function ProfileHeader({
  profileData,
  displayHandle,
  onEditProfile,
  onShare,
  onAvatarUpload,
  onCoverUpload,
  uploadingAvatar,
  uploadingCover,
  onFollow,
  onMessage,
}) {
  const raw = profileData.stats || { posts: 0, followers: 0, following: 0, likes: 0 };
  const stats = {
    posts: Number(raw.posts) || 0,
    followers: Number(raw.followers) || 0,
    following: Number(raw.following) || 0,
    likes: Number(raw.likes) || 0,
  };

  return (
    <header
      id="profile-top"
      className={cn(
        'overflow-hidden rounded-2xl border border-neutral-200/90 bg-neutral-50/40 shadow-sm transition-all duration-200 dark:border-border dark:bg-muted/20',
        'hover:border-neutral-300/90 hover:shadow-md dark:hover:border-border',
      )}
    >
      {/* Cover — 40 / 48 / 56 (160–224px); page contrast via outer bg-neutral-50 */}
      <div className="relative h-40 overflow-hidden rounded-t-2xl sm:h-48 md:h-52">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary to-primary/75" aria-hidden />
        {profileData.coverImage ? (
          <img
            src={resolveMediaUrl(profileData.coverImage) || profileData.coverImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" aria-hidden />

        <div className="relative flex h-full items-start justify-end gap-3 p-4 sm:p-5">
          <button
            type="button"
            onClick={onShare}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/45 bg-white/95 px-4 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition-all duration-200 hover:bg-white"
          >
            <Share2 className="h-4 w-4 shrink-0" strokeWidth={2} />
            Share
          </button>
          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/45 bg-white/95 px-4 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition-all duration-200 hover:bg-white"
          >
            <Edit3 className="h-4 w-4 shrink-0" strokeWidth={2} />
            Edit profile
          </button>
          <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/40 bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20">
            <Camera className="h-4 w-4" strokeWidth={2} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onCoverUpload}
              disabled={uploadingCover}
            />
            <span className="sr-only">Change cover photo</span>
          </label>
        </div>
      </div>

      <div className={profileDesign.headerBody}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
          {/* Avatar overlap — extra -mt compensates for headerBody pt-6 */}
          <div className="relative -mt-[5.5rem] shrink-0 sm:-mt-24 md:-mt-[6.5rem]">
            <UserAvatar
              src={profileData.avatar}
              alt=""
              size="hero"
              showStatus={false}
              fallbackSrc={DEFAULT_AVATAR}
              className="rounded-full bg-white p-1 shadow-lg ring-4 ring-white dark:bg-card dark:ring-background"
            />
            <label className="absolute bottom-1 right-1 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-md transition-transform duration-200 hover:scale-105 active:scale-95 dark:border-card">
              <Camera className="h-4 w-4" strokeWidth={2} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarUpload}
                disabled={uploadingAvatar}
              />
              <span className="sr-only">Change profile photo</span>
            </label>
            {uploadingAvatar ? (
              <p className="mt-2 text-center text-xs font-medium text-neutral-500">Updating photo…</p>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-2 pt-2 sm:space-y-3 sm:pb-1 sm:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-800 sm:text-[1.75rem] dark:text-foreground">
                {profileData.name}
              </h1>
              {profileData.isPro ? (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  Pro
                </span>
              ) : null}
            </div>
            <p className="text-sm font-medium text-neutral-500 dark:text-muted-foreground">{displayHandle}</p>
            <p className="text-base font-semibold text-neutral-700 dark:text-foreground/95">{profileData.title}</p>
            {profileData.bio ? (
              <p
                className={cn(
                  profileDesign.body,
                  'line-clamp-4 max-w-2xl text-neutral-700 sm:line-clamp-none',
                )}
              >
                {profileData.bio}
              </p>
            ) : null}

            {profileData.location ? (
              <p className="flex items-center gap-2 text-sm font-normal text-neutral-600 dark:text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
                {profileData.location}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              {profileData.socialLinks?.linkedin ? (
                <a
                  href={profileData.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:border-primary/30 hover:bg-white dark:border-border dark:bg-muted/30 dark:hover:bg-muted"
                >
                  <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                  LinkedIn
                </a>
              ) : null}
              {profileData.socialLinks?.twitter ? (
                <a
                  href={profileData.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:border-primary/30 hover:bg-white dark:border-border dark:bg-muted/30 dark:hover:bg-muted"
                >
                  <Twitter className="h-3.5 w-3.5 text-sky-500" />
                  Twitter
                </a>
              ) : null}
              {profileData.socialLinks?.github ? (
                <a
                  href={profileData.socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:border-primary/30 hover:bg-white dark:border-border dark:bg-muted/30 dark:hover:bg-muted"
                >
                  <Github className="h-3.5 w-3.5 text-neutral-700 dark:text-foreground" />
                  GitHub
                </a>
              ) : null}
              {profileData.socialLinks?.website ? (
                <a
                  href={profileData.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:border-primary/35 hover:bg-white dark:border-border dark:bg-muted/30"
                >
                  <Globe className="h-3.5 w-3.5" strokeWidth={2} />
                  Website
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-6 sm:grid-cols-4 dark:border-border/60">
          {[
            { value: stats.posts, label: 'Posts' },
            { value: stats.followers, label: 'Followers' },
            { value: stats.following, label: 'Following' },
            { value: stats.likes, label: 'Likes' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-transparent bg-neutral-50/90 px-3 py-4 text-center transition-all duration-200 hover:border-neutral-200 hover:bg-white dark:bg-muted/25 dark:hover:border-border dark:hover:bg-muted/40"
            >
              <p className="text-xl font-bold tabular-nums text-neutral-800 dark:text-foreground sm:text-2xl">
                {s.value.toLocaleString()}
              </p>
              <p className={cn(profileDesign.caption, 'mt-2 normal-case')}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 border-t border-neutral-100 pt-6 dark:border-border/60">
          <button type="button" onClick={onFollow} className={profileDesign.btnPrimary}>
            <UserPlus className="h-4 w-4" strokeWidth={2} />
            Follow
          </button>
          <button type="button" onClick={onMessage} className={profileDesign.btnSecondary}>
            <MessageCircle className="h-4 w-4" strokeWidth={2} />
            Message
          </button>
          <button type="button" onClick={onEditProfile} className={profileDesign.btnSecondary}>
            <Edit3 className="h-4 w-4" strokeWidth={2} />
            Edit profile
          </button>
        </div>
        </div>
      </div>
    </header>
  );
}
