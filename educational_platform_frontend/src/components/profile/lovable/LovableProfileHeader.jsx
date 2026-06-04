import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  Share2,
  Edit3,
  Camera,
  BadgeCheck,
  AtSign,
  MessageCircle,
  UserPlus,
  UserMinus,
  Users,
  Loader2,
  MoreHorizontal,
  Check,
  Link2,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/services/postService';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatStatValue } from '@/components/profile/lovable/profileHeaderUtils';

const EASE_OUT = [0.22, 1, 0.36, 1];

function initials(name) {
  return (name || 'U')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function toDisplayName(raw) {
  if (!raw) return '';
  if (raw === raw.toUpperCase() && /[A-Z]{2,}/.test(raw)) {
    return raw.replace(/\b([A-Z])([A-Z]+)\b/g, (_, f, r) => f + r.toLowerCase());
  }
  return raw;
}

function displayWebsite(url) {
  if (!url) return null;
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return String(url).replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
}

/* Cover text only shown on the DEFAULT gradient cover (no custom image) */
function buildCoverHeadline(profileData) {
  if (profileData?.coverHeadline) return profileData.coverHeadline;
  if (profileData?.headline && profileData.headline.length > 8) return profileData.headline;
  if (profileData?.title && profileData.title.length > 8) return profileData.title;
  const role = profileData?.userType
    ? String(profileData.userType).charAt(0).toUpperCase() + String(profileData.userType).slice(1)
    : null;
  const institution = profileData?.tenant_name || profileData?.academicInfo?.university;
  if (role && institution) return `${role} at ${institution}`;
  if (institution) return institution;
  return null;
}

function buildCoverSubline(profileData, skillTags) {
  if (profileData?.coverSubline) return profileData.coverSubline;
  if (skillTags && skillTags.length >= 2) {
    return skillTags.slice(0, 6).map((s) => String(s).toUpperCase()).join(' · ');
  }
  const course = profileData?.academicInfo?.course;
  const year = profileData?.academicInfo?.graduationYear;
  if (course) return [course, year ? `Class of ${year}` : null].filter(Boolean).join(' · ').toUpperCase();
  return null;
}

export default function LovableProfileHeader({
  profileData,
  resolvedHandle,
  visitorMode,
  roles,
  activeRole,
  onRoleChange,
  onShareProfile,
  onEditProfile,
  onCoverUpload,
  onAvatarUpload,
  uploadingCover,
  uploadingAvatar,
  onMessage,
  connectionStatus,
  onConnect,
  connectBusy,
  stats,
  skillTags = [],
  mutualConnections = 0,
  onStatClick,
}) {
  const hasCustomCover = Boolean(profileData?.coverImage);
  const coverSrc = hasCustomCover
    ? resolveMediaUrl(profileData.coverImage) || profileData.coverImage
    : null;

  const avatarSrc = profileData?.avatar ? resolveMediaUrl(profileData.avatar) || profileData.avatar : null;

  const roleBadge = activeRole || 'Student';
  const headline =
    profileData?.headline ||
    profileData?.title ||
    `${roleBadge} · ${profileData?.academicInfo?.university || profileData?.tenant_name || 'Vidyalaya Hub'}`;

  /* Cover text is ONLY shown on default gradient (no custom image) — avoids conflict with cover images */
  const bannerHeadline = !hasCustomCover ? buildCoverHeadline(profileData) : null;
  const bannerSubline = !hasCustomCover ? buildCoverSubline(profileData, skillTags) : null;

  const isConnected = connectionStatus === 'connected';
  const isPending = connectionStatus === 'pending';
  const handle = resolvedHandle?.replace(/^@/, '') || '';
  const websiteUrl = profileData?.website || profileData?.socialLinks?.website;
  const website = displayWebsite(websiteUrl);

  const metaItems = [
    handle ? { key: 'handle', icon: AtSign, text: handle } : null,
    profileData?.location ? { key: 'location', icon: MapPin, text: profileData.location } : null,
    website ? { key: 'website', icon: Link2, text: website, href: websiteUrl } : null,
    profileData?.joinedAt
      ? {
          key: 'joined',
          icon: Calendar,
          text: `Joined ${new Date(profileData.joinedAt).toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })}`,
        }
      : null,
  ].filter(Boolean);

  const openToOpps =
    !visitorMode &&
    (profileData?.userType === 'alumni' || profileData?.userType === 'teacher') &&
    !profileData?.professionalInfo?.company;

  return (
    <motion.section
      className="premium-profile-header"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: EASE_OUT }}
    >
      {/* ── Cover banner ── */}
      <div
        className={cn(
          'premium-profile-header__cover group/cover',
          !hasCustomCover && 'premium-profile-header__cover--default',
        )}
      >
        {hasCustomCover && coverSrc ? (
          <img
            src={coverSrc}
            alt=""
            className="premium-profile-header__cover-img"
            width={1920}
            height={480}
            loading="eager"
          />
        ) : null}

        {/* Shade overlay */}
        <div
          className={cn(
            'premium-profile-header__cover-shade',
            hasCustomCover && 'premium-profile-header__cover-shade--custom',
          )}
          aria-hidden
        />

        {/* Default gradient decorations */}
        {!hasCustomCover && (
          <>
            <div className="premium-profile-header__cover-mesh" aria-hidden />
            <div className="premium-profile-header__cover-network" aria-hidden />
          </>
        )}

        {/*
          Cover text: only for DEFAULT gradient covers.
          Positioned vertically centered (not at bottom) to avoid the avatar pull-up zone.
          Custom covers show no text — the image is the branding.
        */}
        {!hasCustomCover && (bannerHeadline || bannerSubline) && (
          <div className="premium-profile-header__cover-copy premium-profile-header__cover-copy--centered">
            {bannerHeadline && (
              <p className="premium-profile-header__cover-title">{bannerHeadline}</p>
            )}
            {bannerSubline && (
              <p className="premium-profile-header__cover-subtitle">{bannerSubline}</p>
            )}
          </div>
        )}

        {/* Bottom fade for custom cover — smooth transition into the card below */}
        {hasCustomCover && (
          <div className="premium-profile-header__cover-bottom-fade" aria-hidden />
        )}

        {/* Cover upload button */}
        {!visitorMode && (
          <label
            className={cn(
              'premium-profile-header__cover-upload',
              uploadingCover && 'pointer-events-none opacity-90',
            )}
            title="Upload cover photo"
          >
            {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <span className="premium-profile-header__cover-upload-label">Change cover</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={onCoverUpload}
              disabled={uploadingCover}
            />
          </label>
        )}

        {uploadingCover && <div className="premium-profile-header__cover-loading" aria-hidden />}
      </div>

      {/* ── Identity card: Avatar + Info + Actions ── */}
      <div className="relative bg-card">
        <div className="px-5 pb-6 sm:px-8 sm:pb-8">

          {/* Row 1: Avatar (overlapping cover) + Action buttons */}
          <div className="flex items-start justify-between gap-3">
            {/* Avatar */}
            <div className="relative -mt-14 shrink-0 sm:-mt-[4.5rem] z-10">
              <div className="rounded-full bg-card p-1 shadow-[0_0_0_4px_hsl(var(--card)),0_2px_12px_rgba(0,0,0,0.15)] transition-transform duration-200 hover:scale-[1.02]">
                <Avatar className="h-[108px] w-[108px] sm:h-[132px] sm:w-[132px] border-[3px] border-card bg-muted shadow-sm">
                  {avatarSrc && (
                    <AvatarImage src={avatarSrc} alt={profileData?.name || 'Profile photo'} className="object-cover" />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-3xl font-bold text-white">
                    {initials(profileData?.name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Online presence dot */}
              {profileData?.presence === 'online' && (
                <span
                  className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-[3px] border-card bg-emerald-500 shadow-sm premium-profile-header__online"
                  aria-label="Online"
                />
              )}

              {/* Avatar upload button — own profile only */}
              {!visitorMode && (
                <label
                  className="absolute bottom-0 left-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-[2.5px] border-card bg-foreground text-background shadow-md transition-transform hover:scale-110"
                  title="Change profile photo"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={onAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
            </div>

            {/* Action buttons — aligned to top-right, with padding-top to clear the cover overlap */}
            <div className="flex flex-wrap items-center gap-2 pt-3 sm:pt-4">
              {visitorMode ? (
                <>
                  <Button
                    disabled={connectBusy || isPending}
                    onClick={() => void onConnect?.()}
                    className={cn(
                      'premium-profile-header__btn premium-profile-header__btn--primary',
                      (isConnected || isPending) && 'premium-profile-header__btn--muted',
                    )}
                  >
                    {connectBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isConnected ? (
                      <><Check className="h-4 w-4" />Following</>
                    ) : isPending ? (
                      <><UserMinus className="h-4 w-4" />Pending</>
                    ) : (
                      <><UserPlus className="h-4 w-4" />Follow</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onMessage}
                    className="premium-profile-header__btn premium-profile-header__btn--outline"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={onEditProfile}
                  className="premium-profile-header__btn premium-profile-header__btn--outline"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit profile
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                className="premium-profile-header__btn-icon"
                onClick={() => void onShareProfile?.()}
                aria-label="Share profile"
              >
                <Share2 className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="premium-profile-header__btn-icon"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => void onShareProfile?.()}>
                    Copy profile link
                  </DropdownMenuItem>
                  {visitorMode && (
                    <>
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        Report profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        Block user
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Row 2: Identity — name, headline, meta */}
          <div className="mt-4">
            {/* Name + role badge */}
            <div className="premium-profile-header__name-row">
              <h1 className="premium-profile-header__name">{toDisplayName(profileData?.name)}</h1>
              {(profileData?.is_verified || profileData?.isPro) && (
                <BadgeCheck
                  className="premium-profile-header__verified h-5 w-5"
                  aria-label="Verified"
                />
              )}
              <span className="premium-profile-header__role-pill">{roleBadge}</span>
            </div>

            {/* Open to opportunities */}
            {openToOpps && (
              <div className="premium-profile-header__opp-badge mt-2">
                <Briefcase className="h-3 w-3 shrink-0" aria-hidden />
                Open to opportunities
              </div>
            )}

            {/* Headline */}
            <p className="premium-profile-header__headline mt-1.5">{headline}</p>

            {/* Mutual connections (visitor mode) */}
            {visitorMode && mutualConnections > 0 && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary/60" aria-hidden />
                {mutualConnections} mutual connection{mutualConnections !== 1 ? 's' : ''}
              </p>
            )}

            {/* Meta: handle · location · website · joined */}
            {metaItems.length > 0 && (
              <ul className="premium-profile-header__meta mt-3">
                {metaItems.map((item) => {
                  const Icon = item.icon;
                  const inner = (
                    <>
                      <Icon className="premium-profile-header__meta-icon" aria-hidden />
                      <span>{item.text}</span>
                    </>
                  );
                  return (
                    <li key={item.key} className="premium-profile-header__meta-item">
                      {item.href ? (
                        <a
                          href={String(item.href).startsWith('http') ? String(item.href) : `https://${String(item.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="premium-profile-header__meta-link"
                        >
                          {inner}
                        </a>
                      ) : inner}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Skill tags */}
            {skillTags.length > 0 && (
              <div className="premium-profile-header__skills mt-3.5">
                {skillTags.map((tag) => (
                  <span key={tag} className="premium-profile-header__skill-pill">{tag}</span>
                ))}
              </div>
            )}

            {/* Role switcher */}
            {roles?.length > 1 && (
              <div className="premium-profile-header__roles mt-3.5">
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={!visitorMode ? () => onRoleChange?.(r) : undefined}
                    className={cn(
                      'premium-profile-header__role-switch',
                      activeRole === r && 'premium-profile-header__role-switch--active',
                      visitorMode && 'premium-profile-header__role-switch--readonly',
                    )}
                    aria-pressed={activeRole === r}
                    aria-disabled={visitorMode ? true : undefined}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="premium-profile-header__stats-strip">
        {[
          { key: 'followers',   label: 'Followers',   value: formatStatValue(stats?.followers   ?? 0) },
          { key: 'following',   label: 'Following',   value: formatStatValue(stats?.following   ?? 0) },
          { key: 'connections', label: 'Connections', value: formatStatValue(stats?.connections ?? 0) },
          { key: 'posts',       label: 'Posts',       value: formatStatValue(stats?.posts       ?? 0) },
        ].map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onStatClick?.(s.key)}
            className={cn(
              'premium-profile-header__stat-col rounded-lg text-left transition-colors duration-150',
              i > 0 && 'premium-profile-header__stat-col--divider',
              onStatClick ? 'cursor-pointer hover:bg-muted/40' : 'cursor-default',
            )}
          >
            <span className="premium-profile-header__stat-num">{s.value}</span>
            <span className="premium-profile-header__stat-lbl">{s.label}</span>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
