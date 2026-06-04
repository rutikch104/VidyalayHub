import { useEffect, useState } from 'react';
import {
  Github,
  Linkedin,
  Twitter,
  Globe,
  Sparkles,
  ArrowRight,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import connectionService from '@/services/connectionService';
import feedService from '@/services/feedService';
import { resolveMediaUrl } from '@/services/postService';
import { useProfileNavigationOptional } from '@/contexts/ProfileNavigationContext';

function RailCard({ children, className = '' }) {
  return (
    <section
      className={`rounded-[1.25rem] border border-border/60 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)] transition-shadow duration-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.05)] ${className}`}
    >
      {children}
    </section>
  );
}

function RailCardTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-foreground">{children}</p>
      {action}
    </div>
  );
}

export default function LovableProfileSidebar({
  completion,
  visitorMode,
  socialLinks = {},
  onBoostProfile,
  onNavigate,
}) {
  const profileNav = useProfileNavigationOptional();
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [connectingIds, setConnectingIds] = useState(new Set());

  const links = [
    socialLinks.linkedin && { label: 'LinkedIn', href: socialLinks.linkedin, icon: Linkedin },
    socialLinks.github && { label: 'GitHub', href: socialLinks.github, icon: Github },
    socialLinks.twitter && { label: 'X / Twitter', href: socialLinks.twitter, icon: Twitter },
    socialLinks.website && { label: 'Portfolio', href: socialLinks.website, icon: Globe },
  ].filter(Boolean);

  const pct = Math.min(100, completion ?? 0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (visitorMode) { setLoadingSuggestions(false); return; }
      setLoadingSuggestions(true);
      try {
        const [sugRes, trendRes] = await Promise.allSettled([
          connectionService.getNetworkSuggestions({ limit: 3, page: 1 }),
          feedService.getTrendingTopicsDetailed(),
        ]);
        if (cancelled) return;
        if (sugRes.status === 'fulfilled') setSuggestions(sugRes.value?.users?.slice(0, 3) || []);
        if (trendRes.status === 'fulfilled') {
          const tags = trendRes.value?.hashtags?.slice(0, 3) || [];
          setTrending(
            tags
              .map((t) => ({
                tag: String(typeof t === 'string' ? t : t?.tag || '').trim(),
                count: typeof t === 'object' && t?.count != null ? `${t.count} posts` : 'Trending',
              }))
              .filter((t) => t.tag),
          );
        }
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visitorMode]);

  const trendingItems =
    trending.length > 0
      ? trending
      : [
          { tag: '#GenerativeAI', count: '2.4k posts' },
          { tag: '#VidyalayaHub', count: '812 posts' },
          { tag: '#CampusHiring', count: 'Trending' },
        ];

  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:z-10 lg:self-start">
      {!visitorMode ? (
        <RailCard>
          <RailCardTitle
            action={
              <span className="text-sm font-bold text-gradient">
                {pct}%
              </span>
            }
          >
            Profile strength
          </RailCardTitle>
          <Progress value={pct} className="mt-3 h-2" />
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            {pct < 60
              ? 'Add a bio, skills, and a project to stand out to recruiters.'
              : pct < 90
                ? 'Almost there! Add certifications or experience to reach All-Star.'
                : 'Great profile! Strong profiles get 4× more connection requests.'}
          </p>
          {onBoostProfile ? (
            <Button
              size="sm"
              className="mt-3 w-full bg-gradient-primary text-primary-foreground shadow-md hover:shadow-glow"
              onClick={onBoostProfile}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Boost profile
            </Button>
          ) : null}
        </RailCard>
      ) : null}

      {!visitorMode ? (
        <RailCard>
          <RailCardTitle
            action={
              <button
                type="button"
                onClick={() => onNavigate?.('network')}
                className="text-xs font-medium text-primary transition-opacity hover:opacity-75"
              >
                See all
              </button>
            }
          >
            People you may know
          </RailCardTitle>
          {loadingSuggestions ? (
            <div className="mt-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No suggestions right now.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {suggestions.map((s) => {
                const name = s.name || s.full_name || 'Member';
                const avatar = resolveMediaUrl(s.avatar_url || s.avatar) || s.avatar_url || s.avatar;
                return (
                  <li key={s.id || s.user_id} className="group flex items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-muted/40">
                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-background">
                      {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
                      <AvatarFallback className="text-xs font-semibold">{name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          const uid = s.id || s.user_id;
                          if (profileNav?.openProfile) profileNav.openProfile(uid);
                          else onNavigate?.('user-profile');
                        }}
                        className="block w-full truncate text-left text-sm font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {name}
                      </button>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {[s.headline || s.role, s.mutual_count != null ? `${s.mutual_count} mutual` : null]
                          .filter(Boolean)
                          .join(' · ') || 'Suggested for you'}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={connectingIds.has(s.id || s.user_id)}
                      className="h-8 w-8 shrink-0 rounded-full border-border/60 transition-all hover:border-primary/40 hover:bg-primary/[0.08] hover:text-primary"
                      aria-label="Connect"
                      onClick={async () => {
                        const uid = s.id || s.user_id;
                        if (!uid || connectingIds.has(uid)) return;
                        setConnectingIds((prev) => new Set(prev).add(uid));
                        try {
                          await connectionService.sendConnectionRequest(uid);
                          setSuggestions((prev) => prev.filter((x) => (x.id || x.user_id) !== uid));
                        } catch {
                          /* ignore — user can retry */
                        } finally {
                          setConnectingIds((prev) => { const n = new Set(prev); n.delete(uid); return n; });
                        }
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </RailCard>
      ) : null}

      {links.length > 0 ? (
        <RailCard>
          <RailCardTitle>Links</RailCardTitle>
          <ul className="mt-3 space-y-2">
            {links.map((l) => {
              const I = l.icon;
              const host = (() => {
                try {
                  return new URL(l.href).hostname.replace('www.', '');
                } catch {
                  return l.href;
                }
              })();
              return (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-xl border border-border/60 bg-gradient-soft px-3 py-2.5 transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <I className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-xs font-semibold">{l.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{host}</span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </a>
                </li>
              );
            })}
          </ul>
        </RailCard>
      ) : null}

      <RailCard>
        <RailCardTitle>Trending in your network</RailCardTitle>
        <ul className="mt-3 space-y-2">
          {trendingItems.map((t) => {
            const display = t.tag?.startsWith('#') ? t.tag : `#${t.tag || 'topic'}`;
            return (
              <li key={display} className="group flex items-center justify-between rounded-xl px-1 py-1.5 transition-colors hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gradient truncate">{display}</p>
                  <p className="text-[11px] text-muted-foreground">{t.count}</p>
                </div>
                <Button size="sm" variant="ghost" className="ml-2 h-7 shrink-0 px-2 text-xs font-semibold text-primary hover:bg-primary/[0.08]">
                  View
                </Button>
              </li>
            );
          })}
        </ul>
      </RailCard>
    </aside>
  );
}
