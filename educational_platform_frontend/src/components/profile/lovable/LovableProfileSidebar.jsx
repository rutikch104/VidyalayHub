import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Github,
  Linkedin,
  Twitter,
  Globe,
  Sparkles,
  ArrowRight,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import connectionService from '@/services/connectionService';
import feedService from '@/services/feedService';
import { emitNotificationsChanged } from '@/services/notificationService';
import { resolveMediaUrl } from '@/services/postService';
import { normalizeSuggestionPerson } from '@/lib/homeProfileCardHelpers';
import HomeUserSuggestionCard from '@/components/home/HomeUserSuggestionCard';

const SUGGESTION_AVATAR_FALLBACK =
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150';

function resolveSuggestionAvatar(url) {
  return resolveMediaUrl(url || '') || url || SUGGESTION_AVATAR_FALLBACK;
}

function SuggestionsSkeleton({ rows = 3 }) {
  return (
    <div className="animate-pulse space-y-2.5 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 rounded-xl bg-muted" />
      ))}
    </div>
  );
}

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
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [connectBusyId, setConnectBusyId] = useState(null);

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

  const suggestionCards = useMemo(
    () => suggestions.map((person) => normalizeSuggestionPerson(person, resolveSuggestionAvatar)),
    [suggestions],
  );

  const handleConnect = useCallback(async (targetId) => {
    setConnectBusyId(targetId);
    try {
      await connectionService.sendConnectionRequest(targetId);
      setSuggestions((prev) => prev.filter((x) => String(x.id || x.user_id) !== targetId));
      emitNotificationsChanged();
    } catch {
      /* user can retry */
    } finally {
      setConnectBusyId(null);
    }
  }, []);

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
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-xs">
                <Users className="h-4 w-4 text-white" aria-hidden />
              </div>
              <h3 className="platform-rail-card__title">People you may know</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('network')}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 hover:text-brand-800"
            >
              Network
            </button>
          </div>
          {loadingSuggestions ? (
            <SuggestionsSkeleton rows={3} />
          ) : suggestions.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              You&apos;re well connected! Check back later.
            </p>
          ) : (
            <div className="home-user-suggestions">
              {suggestionCards.map((person) => (
                <HomeUserSuggestionCard
                  key={person.id}
                  person={person}
                  connectBusy={connectBusyId === person.id}
                  connected={false}
                  onConnect={handleConnect}
                />
              ))}
            </div>
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
