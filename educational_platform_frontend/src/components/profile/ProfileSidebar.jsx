import { Linkedin, Twitter, Github, Calendar, TrendingUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const card =
  'rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm dark:border-border dark:bg-card';

const PLACEHOLDER_PEOPLE = [
  { name: 'Campus member', role: 'Discover people in Network', color: '#3b82f6' },
  { name: 'Study group', role: 'Join communities', color: '#8b5cf6' },
  { name: 'Mentor', role: 'Teachers & alumni', color: '#10b981' },
];

export default function ProfileSidebar({ profileData, onNavigate, completionScore }) {
  const fallback = Math.min(100, Math.max(0, Number(profileData?.profileCompletion) || 0));
  const completion =
    typeof completionScore === 'number' && !Number.isNaN(completionScore)
      ? Math.min(100, Math.max(0, completionScore))
      : fallback;
  const hasSocial =
    profileData?.socialLinks?.linkedin ||
    profileData?.socialLinks?.twitter ||
    profileData?.socialLinks?.github;

  return (
    <div className="space-y-5">
      {/* Profile insights — VidhyalayHub style */}
      <div className={cn(card)}>
        <h3 className="mb-4 text-base font-bold text-[#111827] dark:text-foreground">Profile insights</h3>
        <div className="mb-3">
          <div className="mb-1.5 flex justify-between text-[14px]">
            <span className="text-[#374151] dark:text-foreground">Profile completion</span>
            <span className="font-semibold text-[#3b82f6]">{completion}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#e5e7eb] dark:bg-muted">
            <div className="h-full w-[85%] max-w-full rounded-full bg-[#3b82f6] transition-all" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-1 text-[12px] text-[#9ca3af]">Complete your profile to increase visibility</p>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-[#f3f4f6] pt-4 dark:border-border/60">
          <div>
            <p className="text-[12px] text-[#9ca3af]">Profile views</p>
            <p className="text-[22px] font-bold text-[#111827] dark:text-foreground">1,245</p>
            <p className="mt-0.5 flex items-center gap-0.5 text-[12px] font-medium text-[#22c55e]">
              <TrendingUp className="h-3 w-3" />↑ 12% this week
            </p>
          </div>
          <div>
            <p className="text-[12px] text-[#9ca3af]">Search appearances</p>
            <p className="text-[22px] font-bold text-[#111827] dark:text-foreground">483</p>
            <p className="mt-0.5 flex items-center gap-0.5 text-[12px] font-medium text-[#22c55e]">
              <TrendingUp className="h-3 w-3" />↑ 8% this week
            </p>
          </div>
        </div>
      </div>

      {hasSocial ? (
        <div className={cn(card)}>
          <h3 className="mb-3 text-[14px] font-semibold text-[#111827] dark:text-foreground">Connect social profiles</h3>
          <div className="divide-y divide-[#f3f4f6] dark:divide-border/60">
            {profileData.socialLinks.linkedin ? (
              <a
                href={profileData.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 py-2.5 text-[14px] text-[#374151] transition-colors hover:text-[#3b82f6]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#dbeafe] text-[12px] font-bold text-[#2563eb]">
                  in
                </span>
                Connect LinkedIn
              </a>
            ) : null}
            {profileData.socialLinks.twitter ? (
              <a
                href={profileData.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 py-2.5 text-[14px] text-[#374151] transition-colors hover:text-[#3b82f6]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#fef3c7] text-[12px] font-bold text-[#d97706]">
                  𝕏
                </span>
                Connect Twitter
              </a>
            ) : null}
            {profileData.socialLinks.github ? (
              <a
                href={profileData.socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 py-2.5 text-[14px] text-[#374151] transition-colors hover:text-[#3b82f6]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#f3f4f6] text-[12px] font-bold text-[#374151]">
                  ⌥
                </span>
                Connect GitHub
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <div className={cn(card)}>
          <h3 className="mb-2 text-[14px] font-semibold">Connect social profiles</h3>
          <p className="text-xs text-muted-foreground">Add links in Edit profile or Settings.</p>
        </div>
      )}

      <div className={cn(card)}>
        <h3 className="mb-3 text-[14px] font-semibold text-[#111827] dark:text-foreground">People you may know</h3>
        <ul className="space-y-0">
          {PLACEHOLDER_PEOPLE.map((p, i) => (
            <li
              key={p.name}
              className="flex items-center justify-between border-b border-[#f3f4f6] py-2.5 last:border-0 dark:border-border/60"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  U{i + 1}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[#111827] dark:text-foreground">{p.name}</p>
                  <p className="text-[12px] text-[#9ca3af]">{p.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('network')}
                className="rounded-md border border-[#d1d5db] bg-white px-3 py-1 text-[13px] font-medium text-[#374151] hover:bg-gray-50 dark:border-border dark:bg-background"
              >
                Connect
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onNavigate?.('network')}
          className="mt-3 w-full text-center text-[13px] font-medium text-[#6b7280] hover:text-[#3b82f6]"
        >
          See more connections
        </button>
      </div>

      <div className={cn(card)}>
        <h3 className="mb-3 text-[14px] font-semibold text-[#3b82f6]">Upcoming events</h3>
        <ul className="space-y-2">
          <li className="flex items-center justify-between border-b border-[#f3f4f6] pb-2 dark:border-border/60">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#6b7280]" />
              <div>
                <p className="text-[14px] font-medium text-[#111827] dark:text-foreground">Career Fair</p>
                <p className="text-[12px] text-[#9ca3af]">Check Events for dates</p>
              </div>
            </div>
            <Plus className="h-4 w-4 text-[#6b7280]" />
          </li>
        </ul>
        <button
          type="button"
          onClick={() => onNavigate?.('events')}
          className="mt-3 w-full text-center text-[13px] font-medium text-[#3b82f6] hover:underline"
        >
          View calendar
        </button>
      </div>

      {/* Weather widget — reference */}
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] p-5 text-white shadow-md">
        <p className="text-[15px] font-semibold">Local weather</p>
        <p className="text-[13px] opacity-90">Add location in settings</p>
        <p className="mt-2 text-right text-4xl font-bold">—°</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[12px] opacity-95">
          {['Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day}>
              <div className="opacity-85">{day}</div>
              <div className="font-semibold">—°</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
