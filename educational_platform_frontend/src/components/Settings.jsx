// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Bell,
  Lock,
  User as UserIcon,
  Download,
  Trash2,
  Camera,
  Save,
  Database,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/services/userService';
import { resolveMediaUrl } from '@/services/postService';
import PageHeader from '@/components/ui/PageHeader';
import PlatformTabs from '@/components/ui/PlatformTabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';

const DEFAULT_AVATAR =
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150';

function resolveAvatar(settings, user) {
  const raw = settings?.avatar_url || user?.avatar_url || '';
  return (raw && resolveMediaUrl(raw)) || raw || DEFAULT_AVATAR;
}

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Very weak', color: 'bg-destructive' };
  if (score === 2) return { score, label: 'Weak', color: 'bg-orange-500' };
  if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-500' };
  if (score === 4) return { score, label: 'Good', color: 'bg-primary' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

// ── Reusable section card ─────────────────────────────────────────────────
function SettingCard({ title, description, icon: Icon, children, className = '' }) {
  return (
    <div className={`social-card p-4 sm:p-6 ${className}`}>
      {(title || description) && (
        <div className="mb-5 flex items-start gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
              <Icon className="h-[1.05rem] w-[1.05rem]" />
            </div>
          )}
          <div>
            <h3 className="text-[0.9375rem] font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Toggle row with shadcn Switch ─────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={!!checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

// ── Styled input ─────────────────────────────────────────────────────────
function SettingInput({ label, helper, className = '', ...props }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      )}
      <input
        className={`w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-60 ${className}`}
        {...props}
      />
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

// ── Styled select ─────────────────────────────────────────────────────────
function SettingSelect({ label, helper, children, ...props }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      )}
      <select
        className="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
        {...props}
      >
        {children}
      </select>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

// ── Password field with show/hide toggle ─────────────────────────────────
function PwField({ label, value, onChange, show, onToggleShow, placeholder, autoComplete }) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 pr-10 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Sidebar nav items ─────────────────────────────────────────────────────
const NAV = [
  { id: 'account',       label: 'Profile',         icon: UserIcon    },
  { id: 'notifications', label: 'Notifications',   icon: Bell        },
  { id: 'privacy',       label: 'Privacy',         icon: Shield      },
  { id: 'security',      label: 'Security',        icon: Lock        },
  { id: 'preferences',   label: 'Preferences',     icon: SettingsIcon},
  { id: 'data',          label: 'Data & Account',  icon: Database    },
];

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const avatarInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('account');
  const [settings, setSettings]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '', email: '', phone: '', title: '', bio: '', location: '', website: '',
  });

  // Password state
  const [pwCurrent, setPwCurrent]     = useState('');
  const [pwNew, setPwNew]             = useState('');
  const [pwConfirm, setPwConfirm]     = useState('');
  const [pwSaving, setPwSaving]       = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew]         = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting]           = useState(false);

  // Auto-dismiss success after 3 s
  const successTimer = useRef(null);
  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setError('');
    clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccess(''), 3000);
  }, []);
  useEffect(() => () => clearTimeout(successTimer.current), []);

  useEffect(() => {
    if (!user?.id) return;
    void fetchSettings();
  }, [user?.id]); // eslint-disable-line

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await userService.getUserSettings();
      const raw = resp.avatar_url || user?.avatar_url || '';
      setSettings({ ...resp, avatar_url: raw ? resolveMediaUrl(raw) || raw : '' });
      setProfileData({
        name:     resp.name     || '',
        email:    resp.email    || '',
        phone:    resp.phone    || '',
        title:    resp.title    || '',
        bio:      resp.bio      || '',
        location: resp.location || '',
        website:  resp.website  || '',
      });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const parts = profileData.name.trim().split(/\s+/).filter(Boolean);
      const updated = await userService.updateProfile({
        first_name:  parts[0] || '',
        last_name:   parts.slice(1).join(' ') || '',
        phone_number: profileData.phone.trim() || undefined,
        bio:          profileData.bio.trim()      || undefined,
        location:     profileData.location.trim() || undefined,
        website_url:  profileData.website.trim()  || undefined,
      });
      showSuccess('Profile updated!');
      setEditingProfile(false);
      if (updateUser) {
        const displayName = [updated.first_name, updated.last_name].filter(Boolean).join(' ') || updated.name;
        updateUser({ ...user, name: displayName, first_name: updated.first_name, last_name: updated.last_name, avatar_url: updated.avatar_url || user.avatar_url });
      }
      await fetchSettings();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const patchNotification = async (key, value) => {
    if (!settings) return;
    try {
      const data = await userService.updateUserSettings({ notification_settings: { ...settings.notification_settings, [key]: value } });
      setSettings(data);
      showSuccess('Notification preferences saved.');
    } catch (err) { setError(err?.response?.data?.message || err?.message || 'Failed to update'); }
  };

  const patchPrivacy = async (key, value) => {
    if (!settings) return;
    try {
      const data = await userService.updateUserSettings({ privacy_settings: { ...settings.privacy_settings, [key]: value } });
      setSettings(data);
      showSuccess('Privacy settings saved.');
    } catch (err) { setError(err?.response?.data?.message || err?.message || 'Failed to update'); }
  };

  const patchPreference = async (key, value) => {
    if (!settings) return;
    try {
      const data = await userService.updateUserSettings({ preferences: { ...settings.preferences, [key]: value } });
      setSettings(data);
      showSuccess('Preferences saved.');
    } catch (err) { setError(err?.response?.data?.message || err?.message || 'Failed to update'); }
  };

  const patchSecurity = async (key, value) => {
    if (!settings) return;
    try {
      const data = await userService.updateUserSettings({ security_settings: { ...settings.security_settings, [key]: value } });
      setSettings(data);
      showSuccess('Security settings saved.');
    } catch (err) { setError(err?.response?.data?.message || err?.message || 'Failed to update'); }
  };

  const submitPasswordChange = async () => {
    setError('');
    if (!pwCurrent) { setError('Enter your current password.'); return; }
    if (pwNew.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (pwNew !== pwConfirm) { setError('Passwords do not match.'); return; }
    setPwSaving(true);
    try {
      await userService.changePassword(pwCurrent, pwNew);
      showSuccess('Password changed successfully!');
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      await fetchSettings();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to change password');
    } finally { setPwSaving(false); }
  };

  const handleExportData = async () => {
    setError('');
    try {
      const resp = await userService.exportUserData();
      const blob = new Blob([JSON.stringify(resp, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
      showSuccess('Data exported!');
    } catch (err) { setError(err?.response?.data?.message || err?.message || 'Export failed'); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) { setError('Enter your password.'); return; }
    setDeleting(true);
    setError('');
    try {
      await userService.deleteAccount(deletePassword);
      await logout();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setError('');
    try {
      const { avatar_url } = await userService.uploadAvatar(file);
      const resolved = avatar_url ? resolveMediaUrl(avatar_url) || avatar_url : '';
      showSuccess('Profile photo updated.');
      if (updateUser) updateUser({ ...user, avatar_url: resolved || user.avatar_url });
      setSettings((prev) => prev ? { ...prev, avatar_url: resolved } : prev);
    } catch (err) { setError(err?.response?.data?.message || err?.message || 'Upload failed'); }
  };

  const fmtDate = (raw) => {
    try { const d = new Date(raw); return isNaN(d) ? 'Unknown' : d.toLocaleDateString(); }
    catch { return 'Unknown'; }
  };

  const pwStrength = getPasswordStrength(pwNew);

  // ── Guards ───────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="platform-page flex items-center justify-center text-sm text-muted-foreground">
        Sign in to manage your account settings.
      </div>
    );
  }
  if (loading) {
    return (
      <div className="platform-page flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!settings) {
    return (
      <div className="platform-page flex items-center justify-center">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-4 text-center text-sm text-destructive sm:px-6">
          {error || 'Failed to load settings.'}
          <button type="button" onClick={fetchSettings} className="mt-3 block w-full text-xs underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Alias the settings sub-objects for clean references
  const ns    = settings.notification_settings || {};
  const ps    = settings.privacy_settings      || {};
  const prefs = settings.preferences           || {};
  const ss    = settings.security_settings     || {};

  // ── Tab renderers ─────────────────────────────────────────────────────────

  const renderProfile = () => (
    <div className="space-y-5">
      {/* Avatar */}
      <SettingCard title="Profile Photo" description="Shown across the platform. Max 5 MB, JPEG/PNG/WebP.">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarUpload}
        />
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative shrink-0">
            <img
              src={resolveAvatar(settings, user)}
              alt="Profile"
              onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-border/60 shadow-sm sm:h-20 sm:w-20"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
              aria-label="Upload photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{settings.name}</p>
            <p className="truncate text-xs text-muted-foreground">{settings.email}</p>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Change photo
            </button>
          </div>
        </div>
      </SettingCard>

      {/* Profile info */}
      <SettingCard
        title={editingProfile ? 'Edit Profile' : 'Personal Information'}
        description="Your name, bio, and contact details."
      >
        {editingProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SettingInput
                label="Full name"
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Your full name"
              />
              <SettingInput
                label="Email"
                type="email"
                value={profileData.email}
                disabled
                readOnly
                helper="Contact support to change your sign-in email."
              />
              <SettingInput
                label="Phone number"
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+91 9876543210"
              />
              <SettingInput
                label="Account type"
                type="text"
                value={profileData.title}
                disabled
                readOnly
                helper="Based on your registered account type."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Bio</label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
                maxLength={300}
                placeholder="Tell others about yourself…"
                className="w-full resize-none rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
              <p className="mt-0.5 text-right text-[10px] text-muted-foreground/50">
                {profileData.bio.length}/300
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SettingInput
                label="Location"
                type="text"
                value={profileData.location}
                onChange={(e) => setProfileData((p) => ({ ...p, location: e.target.value }))}
                placeholder="City, Country"
              />
              <SettingInput
                label="Website"
                type="url"
                value={profileData.website}
                onChange={(e) => setProfileData((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://yoursite.com"
              />
            </div>

            <div className="flex items-center gap-3 border-t border-border/40 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => { setEditingProfile(false); setError(''); }}
                className="rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: 'Full name',     value: settings.name },
                { label: 'Email',         value: settings.email },
                { label: 'Phone',         value: settings.phone    || '—' },
                { label: 'Account type',  value: settings.title    || '—' },
                { label: 'Location',      value: settings.location || '—' },
                { label: 'Website',       value: settings.website  || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-muted/30 px-3.5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</p>
                  <p className="mt-0.5 truncate text-sm text-foreground">{value}</p>
                </div>
              ))}
            </div>
            {settings.bio && (
              <div className="rounded-xl bg-muted/30 px-3.5 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Bio</p>
                <p className="mt-0.5 text-sm leading-relaxed text-foreground">{settings.bio}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setEditingProfile(true)}
              className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Edit profile
            </button>
          </div>
        )}
      </SettingCard>
    </div>
  );

  const renderNotifications = () => {
    const groups = [
      {
        id: 'comm',
        title: 'Communication Channels',
        description: 'Choose how the platform contacts you.',
        items: [
          { key: 'email_notifications', label: 'Email notifications',  desc: 'Receive updates via email' },
          { key: 'push_notifications',  label: 'Push notifications',   desc: 'Browser and app push alerts' },
          { key: 'sms_notifications',   label: 'SMS notifications',    desc: 'Text messages to your phone' },
        ],
      },
      {
        id: 'social',
        title: 'Social & Network',
        description: 'Activity from your connections and content.',
        items: [
          { key: 'connection_requests', label: 'Connection requests',  desc: 'When someone wants to connect' },
          { key: 'new_messages',        label: 'Direct messages',      desc: 'New message alerts' },
          { key: 'post_likes',          label: 'Post likes',           desc: 'When someone likes your post' },
          { key: 'post_comments',       label: 'Post comments',        desc: 'When someone comments on your post' },
        ],
      },
      {
        id: 'platform',
        title: 'Platform',
        description: 'Jobs, learning, and platform announcements.',
        items: [
          { key: 'job_alerts',          label: 'Job alerts',           desc: 'New opportunities matching your profile' },
          { key: 'learning_reminders',  label: 'Learning reminders',   desc: 'Stay on track with resources and courses' },
          { key: 'marketing_emails',    label: 'Platform updates',     desc: 'News, features, and announcements' },
        ],
      },
    ];

    return (
      <div className="space-y-5">
        {groups.map((g) => (
          <SettingCard key={g.id} title={g.title} description={g.description}>
            <div className="space-y-2">
              {g.items.map(({ key, label, desc }) => (
                <ToggleRow
                  key={key}
                  label={label}
                  description={desc}
                  checked={!!ns[key]}
                  onChange={(val) => patchNotification(key, val)}
                />
              ))}
            </div>
          </SettingCard>
        ))}
      </div>
    );
  };

  const renderPrivacy = () => (
    <div className="space-y-5">
      <SettingCard
        title="Profile Visibility"
        description="Control who can discover and view your profile."
      >
        <SettingSelect
          label="Who can see your profile"
          value={ps.profile_visibility || 'public'}
          onChange={(e) => patchPrivacy('profile_visibility', e.target.value)}
        >
          <option value="public">Everyone (Public)</option>
          <option value="connections">Connections only</option>
          <option value="private">Private (hidden)</option>
        </SettingSelect>
      </SettingCard>

      <SettingCard
        title="Contact Visibility"
        description="Choose which contact details appear on your public profile."
      >
        <div className="space-y-2">
          <ToggleRow
            label="Show email address"
            description="Visible to anyone who views your profile"
            checked={!!ps.show_email}
            onChange={(val) => patchPrivacy('show_email', val)}
          />
          <ToggleRow
            label="Show phone number"
            description="Visible on your public profile"
            checked={!!ps.show_phone}
            onChange={(val) => patchPrivacy('show_phone', val)}
          />
        </div>
      </SettingCard>

      <SettingCard
        title="Interactions"
        description="Manage how others can reach and interact with you."
      >
        <div className="space-y-2">
          <ToggleRow
            label="Allow direct messages"
            description="Let other users send you messages"
            checked={!!ps.allow_messages}
            onChange={(val) => patchPrivacy('allow_messages', val)}
          />
          <ToggleRow
            label="Allow connection requests"
            description="Let others send you connection requests"
            checked={!!ps.allow_connection_requests}
            onChange={(val) => patchPrivacy('allow_connection_requests', val)}
          />
          <ToggleRow
            label="Show online status"
            description="Let others see when you're active"
            checked={!!ps.show_online_status}
            onChange={(val) => patchPrivacy('show_online_status', val)}
          />
          <ToggleRow
            label="Profile view tracking"
            description="See who has viewed your profile"
            checked={!!ps.allow_profile_views}
            onChange={(val) => patchPrivacy('allow_profile_views', val)}
          />
        </div>
      </SettingCard>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-5">
      {/* Password change */}
      <SettingCard title="Change Password" description="Use a strong, unique password for the best protection.">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Last changed:{' '}
            <span className="font-medium text-foreground">{fmtDate(ss.password_last_changed)}</span>
          </p>

          <PwField
            label="Current password"
            value={pwCurrent}
            onChange={(e) => setPwCurrent(e.target.value)}
            show={showPwCurrent}
            onToggleShow={() => setShowPwCurrent((v) => !v)}
            placeholder="Your current password"
            autoComplete="current-password"
          />

          <div>
            <PwField
              label="New password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              show={showPwNew}
              onToggleShow={() => setShowPwNew((v) => !v)}
              placeholder="Min 8 characters"
              autoComplete="new-password"
            />
            {pwNew && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= pwStrength.score ? pwStrength.color : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Strength:{' '}
                  <span className="font-semibold text-foreground">{pwStrength.label}</span>
                </p>
              </div>
            )}
          </div>

          <div>
            <PwField
              label="Confirm new password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              show={showPwConfirm}
              onToggleShow={() => setShowPwConfirm((v) => !v)}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
            {pwConfirm && pwNew && (
              <p className={`mt-1 text-[11px] font-medium ${pwNew === pwConfirm ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                {pwNew === pwConfirm ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
            onClick={submitPasswordChange}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {pwSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </SettingCard>

      {/* Security options */}
      <SettingCard
        title="Account Security"
        description="Extra layers of protection for your account."
      >
        <div className="space-y-2">
          <ToggleRow
            label="Two-factor authentication"
            description="Require a second verification step at sign-in"
            checked={!!ss.two_factor_enabled}
            onChange={(val) => patchSecurity('two_factor_enabled', val)}
          />
          <ToggleRow
            label="Login activity alerts"
            description="Get notified when a new device signs in"
            checked={!!ss.login_notifications}
            onChange={(val) => patchSecurity('login_notifications', val)}
          />
        </div>
      </SettingCard>

      {/* Session timeout */}
      <SettingCard
        title="Session Management"
        description="Control how long your login stays active while idle."
      >
        <SettingSelect
          label="Auto sign-out after"
          value={ss.session_timeout || 60}
          onChange={(e) => patchSecurity('session_timeout', parseInt(e.target.value, 10))}
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
          <option value={480}>8 hours</option>
        </SettingSelect>
      </SettingCard>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-5">
      <SettingCard title="Appearance" description="Choose how the platform looks for you.">
        <SettingSelect
          label="Theme"
          value={prefs.theme || 'auto'}
          onChange={(e) => patchPreference('theme', e.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">System default</option>
        </SettingSelect>
      </SettingCard>

      <SettingCard title="Language & Region" description="Set your preferred language and time display.">
        <div className="space-y-4">
          <SettingSelect
            label="Language"
            value={prefs.language || 'en'}
            onChange={(e) => patchPreference('language', e.target.value)}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="es">Español (Spanish)</option>
            <option value="fr">Français (French)</option>
            <option value="de">Deutsch (German)</option>
          </SettingSelect>
          <SettingSelect
            label="Time format"
            value={prefs.time_format || '12h'}
            onChange={(e) => patchPreference('time_format', e.target.value)}
          >
            <option value="12h">12-hour (2:30 PM)</option>
            <option value="24h">24-hour (14:30)</option>
          </SettingSelect>
        </div>
      </SettingCard>

      <SettingCard
        title="Email Digest"
        description="How often you receive summary emails from the platform."
      >
        <SettingSelect
          label="Digest frequency"
          value={prefs.email_frequency || 'daily'}
          onChange={(e) => patchPreference('email_frequency', e.target.value)}
        >
          <option value="immediate">Immediately (as events happen)</option>
          <option value="daily">Daily digest</option>
          <option value="weekly">Weekly digest</option>
        </SettingSelect>
      </SettingCard>
    </div>
  );

  const renderData = () => (
    <div className="space-y-5">
      <SettingCard
        title="Download Your Data"
        description="Get a complete JSON export of your profile, posts, and account activity."
      >
        <button
          type="button"
          onClick={handleExportData}
          className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Export all data</p>
              <p className="text-xs text-muted-foreground">Downloads as a .json file</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </SettingCard>

      <SettingCard
        title="Danger Zone"
        description="These actions are permanent and cannot be undone."
        className="border-destructive/20"
      >
        <button
          type="button"
          onClick={() => { setDeleteOpen(true); setDeletePassword(''); setError(''); }}
          className="flex w-full items-center justify-between rounded-xl border border-destructive/30 bg-destructive/[0.04] px-4 py-3.5 text-left transition-colors hover:bg-destructive/[0.08]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">Delete account</p>
              <p className="text-xs text-muted-foreground">Permanently remove your account and all data</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-destructive/50" />
        </button>
      </SettingCard>

      {/* Delete account dialog */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) { setDeletePassword(''); setError(''); }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your profile, posts, connections, and all associated data.
              This action <strong>cannot be undone</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Confirm with your current password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-destructive/50 focus:outline-none focus:ring-2 focus:ring-destructive/15"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || !deletePassword.trim()}
              onClick={(e) => { e.preventDefault(); void handleDeleteAccount(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Deleting…</>
              ) : (
                'Yes, delete account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'account':       return renderProfile();
      case 'notifications': return renderNotifications();
      case 'privacy':       return renderPrivacy();
      case 'security':      return renderSecurity();
      case 'preferences':   return renderPreferences();
      case 'data':          return renderData();
      default:              return null;
    }
  };

  return (
    <div className="platform-page">
      <div className="platform-page__container">
        {/* Premium hero */}
        <PageHeader
          icon={SettingsIcon}
          badge="Account"
          title="Settings"
          description="Manage your profile, privacy, notifications, and account security."
          variant="slate"
        />

        {/* Status banners */}
        {success && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              className="shrink-0 text-destructive/60 transition-colors hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Mobile tab strip (visible below lg) */}
        <div className="mt-6 lg:hidden">
          <PlatformTabs
            tabs={NAV.map((item) => ({
              key: item.id,
              label: item.label,
              icon: item.icon,
            }))}
            activeKey={activeTab}
            onChange={(id) => {
              setActiveTab(id);
              setError('');
            }}
            ariaLabel="Settings sections"
            size="compact"
          />
        </div>

        {/* Two-column layout */}
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:gap-8">
          {/* Sidebar nav (desktop only) */}
          <nav className="hidden shrink-0 lg:block lg:w-52">
            <div className="social-card overflow-hidden">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setActiveTab(item.id); setError(''); }}
                    className={`flex w-full items-center gap-3 border-b border-border/30 px-4 py-3 text-sm font-medium transition-colors last:border-b-0 ${
                      active
                        ? 'bg-primary/[0.07] text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
