import { useMemo, useState } from 'react';
import { LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import { CONFIRM_ACTION_PRESETS } from '@/components/ui/confirmActionPresets';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { resolveMediaUrl } from '@/services/postService';
import { userDisplayName, userInitials, userRoleLabel } from '@/lib/userDisplayUtils';
import { isNavPageActive } from '@/components/sidebar/navConfig';
import { cn } from '@/lib/utils';

const FALLBACK_AVATAR =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';

function resolveAvatarSrc(user) {
  const raw = user?.avatar_url || user?.profile_picture || '';
  return resolveMediaUrl(raw) || raw || '';
}

export default function HeaderProfileMenu({ currentPage, onNavigate }) {
  const { user, logout } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const name = useMemo(() => userDisplayName(user), [user]);
  const initials = useMemo(() => userInitials(user), [user]);
  const role = useMemo(() => userRoleLabel(user), [user]);
  const avatarSrc = useMemo(() => resolveAvatarSrc(user), [user]);

  const profileActive = isNavPageActive(currentPage, 'profile');
  const settingsActive = isNavPageActive(currentPage, 'settings');
  const signOutPreset = CONFIRM_ACTION_PRESETS.signOut;

  const handleProfile = () => onNavigate?.('profile');
  const handleSettings = () => onNavigate?.('settings');

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      setSignOutOpen(false);
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setSigningOut(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="header-profile-menu__trigger"
            aria-label="Account menu"
          >
            <Avatar className="header-profile-menu__avatar">
              {avatarSrc ? (
                <AvatarImage
                  src={avatarSrc}
                  alt={name}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_AVATAR;
                  }}
                />
              ) : null}
              <AvatarFallback className="header-profile-menu__avatar-fallback">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          side="bottom"
          sideOffset={10}
          className="header-profile-menu__content z-[70] w-[15.5rem] p-0"
        >
          <div className="header-profile-menu__head">
            <Avatar className="header-profile-menu__head-avatar">
              {avatarSrc ? (
                <AvatarImage
                  src={avatarSrc}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_AVATAR;
                  }}
                />
              ) : null}
              <AvatarFallback className="header-profile-menu__avatar-fallback">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="header-profile-menu__name">{name}</p>
              <p className="header-profile-menu__role">{role}</p>
            </div>
          </div>

          <div className="header-profile-menu__items">
            <DropdownMenuItem
              onClick={handleProfile}
              className={cn(
                'header-profile-menu__item',
                profileActive && 'header-profile-menu__item--active',
              )}
            >
              <User className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleSettings}
              className={cn(
                'header-profile-menu__item',
                settingsActive && 'header-profile-menu__item--active',
              )}
            >
              <Settings className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator className="header-profile-menu__separator" />

            <DropdownMenuItem
              onClick={() => setSignOutOpen(true)}
              className="header-profile-menu__item header-profile-menu__item--danger"
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Sign Out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmActionDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title={signOutPreset.title}
        description={signOutPreset.description}
        confirmLabel={signOutPreset.confirmLabel}
        tone={signOutPreset.tone}
        icon={signOutPreset.icon}
        loading={signingOut}
        loadingLabel="Signing out…"
        onConfirm={handleSignOut}
        onCancel={() => setSignOutOpen(false)}
        contextPerson={{
          name,
          avatarUrl: avatarSrc,
          subtitle: role,
        }}
      />
    </>
  );
}
