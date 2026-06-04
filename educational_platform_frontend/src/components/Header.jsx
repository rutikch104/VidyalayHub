import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, Bell, MessageSquare, User, Settings, Menu, X, Sparkles, LogOut,
  ChevronDown, Loader2, Users, FileText, Building2, Briefcase, Calendar, SearchX,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import notificationService from '@/services/notificationService';
import messageService from '@/services/messageService';
import { runGlobalSearch } from '@/services/searchService';
import { HighlightMatch } from '@/components/HighlightMatch';
import { resolveMediaUrl } from '@/services/postService';
import UserAvatar from '@/components/ui/UserAvatar';
import { useProfileNavigationOptional } from '@/contexts/ProfileNavigationContext';
import InstitutionBranding from '@/components/branding/InstitutionBranding';
import { PRESENCE_STATUS } from '@/lib/presence';

const FALLBACK_AVATAR =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';

/* OS-aware keyboard shortcut hint */
const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || '');
const SHORTCUT_HINT = isMac ? '⌘K' : 'Ctrl K';

function headerAvatarSrc(url) {
  return resolveMediaUrl(url || '') || url || FALLBACK_AVATAR;
}

/** Score a string field against the query — lower = more relevant */
function fieldScore(field, q) {
  if (!field) return 99;
  const f = field.toLowerCase();
  if (f === q) return 0;
  if (f.startsWith(q)) return 1;
  if (f.includes(q)) return 2;
  return 99;
}

function userRelevance(u, q) {
  const fn = (u.first_name || '').toLowerCase();
  const ln = (u.last_name  || '').toLowerCase();
  return Math.min(fieldScore(fn, q), fieldScore(ln, q), fieldScore(`${fn} ${ln}`, q));
}

function sortByRelevance(arr, scoreFn) {
  if (!arr?.length) return arr;
  return [...arr].sort((a, b) => scoreFn(a) - scoreFn(b));
}

/* ── Search results panel (shared desktop + mobile overlay) ── */
function SearchResultsPanel({
  query,
  loading,
  results,
  totalHits,
  focusedIdx,
  onItemMouseDown,
  itemRefs,
  textSnippet,
  debouncedQuery,
}) {
  const empty = !loading && results && totalHits === 0;
  const hasError = results && Object.keys(results.errors || {}).length > 0;

  if (query.length < 2) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
        <Search className="h-5 w-5 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">Type at least 2 characters to search</p>
      </div>
    );
  }

  if (loading && !results) {
    return (
      <div className="space-y-1 p-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-2/3 animate-pulse rounded-md bg-muted" />
              <div className="h-2.5 w-1/3 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <SearchX className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">No results for "{query}"</p>
        <p className="text-xs text-muted-foreground">Try different keywords or check your spelling.</p>
      </div>
    );
  }

  let flatIdx = 0;

  const section = (icon, label, items, renderItem) => {
    if (!items?.length) return null;
    const startIdx = flatIdx;
    flatIdx += items.length;
    return (
      <section className="py-1">
        <h3 className="mb-0.5 flex items-center gap-1.5 px-3 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {icon}{label}
        </h3>
        <ul>{items.map((item, i) => renderItem(item, startIdx + i))}</ul>
      </section>
    );
  };

  return (
    <div className="divide-y divide-border/30 p-1.5">
      {hasError && (
        <div className="mx-1.5 mb-2 rounded-lg border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
          Some categories failed to load.
        </div>
      )}

      {section(
        <Users className="h-3 w-3" />,
        'People',
        results?.users,
        (u, idx) => (
          <li key={u.id}>
            <div
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-100 ${
                focusedIdx === idx ? 'bg-muted' : 'hover:bg-muted/60'
              }`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onMouseDown={() => onItemMouseDown({ type: 'user', data: u })}
              >
                <UserAvatar
                  src={headerAvatarSrc(u.avatar_url)}
                  alt={u.name || 'User'}
                  size="sm"
                  showStatus={false}
                  fallbackSrc={FALLBACK_AVATAR}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    <HighlightMatch text={u.name || 'User'} query={debouncedQuery} />
                  </span>
                  <span className="block truncate text-xs capitalize text-muted-foreground">
                    {u.user_type || u.role || 'Member'}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
                onMouseDown={() => onItemMouseDown({ type: 'message', data: u })}
              >
                Message
              </button>
            </div>
          </li>
        ),
      )}

      {section(
        <FileText className="h-3 w-3" />,
        'Posts',
        results?.posts,
        (p, idx) => (
          <li key={p.id}>
            <button
              type="button"
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition-colors duration-100 ${
                focusedIdx === idx ? 'bg-muted' : 'hover:bg-muted/60'
              }`}
              onMouseDown={() => onItemMouseDown({ type: 'post', data: p })}
            >
              <span className="text-[10px] font-medium text-muted-foreground">{p.user?.name || 'Member'}</span>
              <span className="line-clamp-2 text-sm text-foreground">
                <HighlightMatch text={textSnippet(p.content)} query={debouncedQuery} />
              </span>
            </button>
          </li>
        ),
      )}

      {section(
        <Building2 className="h-3 w-3" />,
        'Communities',
        results?.communities,
        (c, idx) => (
          <li key={c.id}>
            <button
              type="button"
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition-colors duration-100 ${
                focusedIdx === idx ? 'bg-muted' : 'hover:bg-muted/60'
              }`}
              onMouseDown={() => onItemMouseDown({ type: 'community', data: c })}
            >
              <span className="text-sm font-semibold text-foreground">
                <HighlightMatch text={c.name} query={debouncedQuery} />
              </span>
              {c.description && (
                <span className="line-clamp-1 text-xs text-muted-foreground">
                  <HighlightMatch text={textSnippet(c.description, 100)} query={debouncedQuery} />
                </span>
              )}
            </button>
          </li>
        ),
      )}

      {section(
        <Briefcase className="h-3 w-3" />,
        'Jobs',
        results?.jobs,
        (j, idx) => {
          const title = j.title || j.job_title || 'Role';
          return (
            <li key={j.id}>
              <button
                type="button"
                ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
                data-idx={idx}
                className={`flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition-colors duration-100 ${
                  focusedIdx === idx ? 'bg-muted' : 'hover:bg-muted/60'
                }`}
                onMouseDown={() => onItemMouseDown({ type: 'job', data: j })}
              >
                <span className="text-sm font-semibold text-foreground">
                  <HighlightMatch text={title} query={debouncedQuery} />
                </span>
                {j.company_name && (
                  <span className="text-xs text-muted-foreground">{j.company_name}</span>
                )}
              </button>
            </li>
          );
        },
      )}

      {section(
        <Calendar className="h-3 w-3" />,
        'Events',
        results?.events,
        (ev, idx) => (
          <li key={ev.id}>
            <button
              type="button"
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition-colors duration-100 ${
                focusedIdx === idx ? 'bg-muted' : 'hover:bg-muted/60'
              }`}
              onMouseDown={() => onItemMouseDown({ type: 'event', data: ev })}
            >
              <span className="text-sm font-semibold text-foreground">
                <HighlightMatch text={ev.title || 'Event'} query={debouncedQuery} />
              </span>
              {ev.start_date && (
                <span className="text-xs text-muted-foreground">{String(ev.start_date)}</span>
              )}
            </button>
          </li>
        ),
      )}
    </div>
  );
}

/* ── Header ── */
const Header = ({ onNavigate, currentPage = 'home', onMobileMenuToggle, isMobileMenuOpen = false }) => {
  const { user, logout } = useAuth();
  const profileNav = useProfileNavigationOptional();
  const userMenuRef     = useRef(null);
  const desktopInputRef = useRef(null);
  const mobileInputRef  = useRef(null);
  const globalSearchReq = useRef(0);
  const itemRefs        = useRef([]);

  const [isSearchFocused,      setIsSearchFocused]      = useState(false);
  const [showUserMenu,         setShowUserMenu]          = useState(false);
  const [unreadNotifCount,     setUnreadNotifCount]      = useState(0);
  const [unreadMsgCount,       setUnreadMsgCount]        = useState(0);
  const [globalQuery,          setGlobalQuery]           = useState('');
  const [debouncedGlobalQuery, setDebouncedGlobalQuery]  = useState('');
  const [globalSearchLoading,  setGlobalSearchLoading]   = useState(false);
  const [globalResults,        setGlobalResults]         = useState(null);
  const [searchPanelOpen,      setSearchPanelOpen]       = useState(false);
  const [mobileSearchOpen,     setMobileSearchOpen]      = useState(false);
  const [focusedIdx,           setFocusedIdx]            = useState(-1);
  const [scrolled,             setScrolled]              = useState(false);

  /* Scroll-aware shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Debounce */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedGlobalQuery(globalQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [globalQuery]);

  /* Search */
  useEffect(() => {
    if (!user || debouncedGlobalQuery.length < 2) {
      setGlobalResults(null);
      setGlobalSearchLoading(false);
      return;
    }
    const id = ++globalSearchReq.current;
    setGlobalSearchLoading(true);
    runGlobalSearch(debouncedGlobalQuery)
      .then((r) => {
        if (globalSearchReq.current === id) {
          const q = debouncedGlobalQuery.trim().toLowerCase();
          setGlobalResults({
            ...r,
            users: sortByRelevance(r.users, (u) => userRelevance(u, q)),
          });
          setGlobalSearchLoading(false);
          setFocusedIdx(-1);
          itemRefs.current = [];
        }
      })
      .catch(() => {
        if (globalSearchReq.current === id) setGlobalSearchLoading(false);
      });
  }, [debouncedGlobalQuery, user]);

  const totalGlobalHits = useMemo(() => (
    (globalResults?.users?.length      || 0) +
    (globalResults?.posts?.length      || 0) +
    (globalResults?.communities?.length || 0) +
    (globalResults?.jobs?.length       || 0) +
    (globalResults?.events?.length     || 0)
  ), [globalResults]);

  const flatCount = useMemo(() => totalGlobalHits, [totalGlobalHits]);

  /* Autofocus mobile search input when overlay opens */
  useEffect(() => {
    if (!mobileSearchOpen) return;
    const t = setTimeout(() => mobileInputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [mobileSearchOpen]);

  /* Close desktop search panel on outside click */
  useEffect(() => {
    if (!searchPanelOpen) return;
    const onDown = (e) => {
      if (!e.target.closest('[data-search-shell]')) {
        setSearchPanelOpen(false);
        setFocusedIdx(-1);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [searchPanelOpen]);

  /* Unread counts */
  useEffect(() => {
    if (!user) { setUnreadNotifCount(0); setUnreadMsgCount(0); return; }
    let cancelled = false;
    const loadNotifications = async () => {
      try { const { unread_count } = await notificationService.getUnreadCount(); if (!cancelled) setUnreadNotifCount(Number(unread_count) || 0); }
      catch { if (!cancelled) setUnreadNotifCount(0); }
    };
    const loadMessages = async () => {
      try { const { total_unread } = await messageService.getUnreadCount(); if (!cancelled) setUnreadMsgCount(Number(total_unread) || 0); }
      catch { if (!cancelled) setUnreadMsgCount(0); }
    };
    const loadAll = () => { void loadNotifications(); void loadMessages(); };
    loadAll();
    const interval = setInterval(loadAll, 45000);
    const onVisible = () => { if (document.visibilityState === 'visible') loadAll(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('app:notifications-changed', () => void loadNotifications());
    window.addEventListener('app:messages-changed',      () => void loadMessages());
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id]);

  /* User menu outside click */
  useEffect(() => {
    if (!showUserMenu) return;
    const close = (e) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showUserMenu]);

  const closeSearch = useCallback(() => {
    setSearchPanelOpen(false);
    setGlobalQuery('');
    setDebouncedGlobalQuery('');
    setGlobalResults(null);
    setFocusedIdx(-1);
  }, []);

  const closeMobileSearch = useCallback(() => {
    setMobileSearchOpen(false);
    closeSearch();
  }, [closeSearch]);

  /* Global keyboard shortcuts */
  useEffect(() => {
    const openSearch = () => {
      if (window.innerWidth >= 768) desktopInputRef.current?.focus();
      else setMobileSearchOpen(true);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        if (mobileSearchOpen) setMobileSearchOpen(false);
        closeSearch();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('vh:open-global-search', openSearch);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('vh:open-global-search', openSearch);
    };
  }, [mobileSearchOpen, closeSearch]);

  const clearQuery = useCallback(() => {
    setGlobalQuery('');
    setDebouncedGlobalQuery('');
    setGlobalResults(null);
    setFocusedIdx(-1);
    itemRefs.current = [];
  }, []);

  const handleLogout = async () => {
    try { await logout(); setShowUserMenu(false); }
    catch (e) { console.error('Logout error:', e); }
  };

  const textSnippet = (s, n = 96) => {
    const t = (s || '').replace(/\s+/g, ' ').trim();
    return t.length <= n ? t : `${t.slice(0, n)}…`;
  };

  const handleSearchKeyDown = useCallback((e) => {
    if (!searchPanelOpen && !mobileSearchOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((prev) => {
        const next = Math.min(prev + 1, flatCount - 1);
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((prev) => {
        if (prev <= 0) return -1;
        const next = prev - 1;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault();
      itemRefs.current[focusedIdx]?.click?.();
    }
  }, [searchPanelOpen, mobileSearchOpen, flatCount, focusedIdx]);

  const handleItemAction = useCallback((action) => {
    const { type, data } = action;
    closeSearch();
    setMobileSearchOpen(false);
    switch (type) {
      case 'user':    profileNav?.openProfile?.(data.id); break;
      case 'message': sessionStorage.setItem('prefill_message_user_id', String(data.id)); onNavigate('messages'); break;
      case 'post':    sessionStorage.setItem('scroll_to_post_id', data.id); onNavigate('home'); break;
      case 'community': sessionStorage.setItem('communities_search_prefill', data.name); onNavigate('communities'); break;
      case 'job':     sessionStorage.setItem('jobs_search_prefill', data.title || data.job_title || ''); onNavigate('jobs'); break;
      case 'event':   sessionStorage.setItem('events_search_prefill', data.title || ''); onNavigate('events'); break;
      default: break;
    }
  }, [closeSearch, onNavigate, profileNav]);

  const showPanel = searchPanelOpen;

  const searchInputBase =
    'w-full rounded-xl border border-border/50 bg-muted/40 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 hover:bg-muted/60 focus:bg-card focus:border-primary/50 focus:outline-none focus:ring-[2px] focus:ring-primary/15';

  const iconBtn = (isActive = false) =>
    `relative rounded-lg p-2 transition-colors duration-150 active:scale-95 ${
      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  /* Shared results panel (desktop + mobile overlay) */
  const panelContent = (
    <SearchResultsPanel
      query={globalQuery.trim()}
      loading={globalSearchLoading}
      results={globalResults}
      totalHits={totalGlobalHits}
      focusedIdx={focusedIdx}
      onItemMouseDown={handleItemAction}
      itemRefs={itemRefs}
      textSnippet={textSnippet}
      debouncedQuery={debouncedGlobalQuery}
    />
  );

  /* ── Minimal super-admin header ── */
  if (currentPage === 'super-admin') {
    return (
      <header className="glass-nav sticky top-0 z-50 border-b border-border/40 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-[4rem] items-center justify-between">
            <div className="flex items-center gap-3">
              <InstitutionBranding onNavigate={onNavigate} className="min-w-0" />
              <span className="hidden rounded-full border border-primary/25 bg-primary/[0.07] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-primary sm:inline">
                Super Admin
              </span>
            </div>
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-expanded={showUserMenu}
                aria-haspopup="menu"
                className={`group flex items-center gap-2 rounded-xl border p-1 transition-all duration-200 sm:pr-2.5 ${
                  showUserMenu
                    ? 'border-primary/25 bg-primary/[0.06]'
                    : 'border-transparent hover:border-border/60 hover:bg-muted/80'
                }`}
              >
                <UserAvatar src={headerAvatarSrc(user?.avatar_url)} alt={user?.name || 'Admin'} size="sm" status={PRESENCE_STATUS.ONLINE} fallbackSrc={FALLBACK_AVATAR} />
                <div className="hidden text-left lg:block">
                  <p className="max-w-[120px] truncate text-xs font-semibold text-foreground">{user?.name || 'Admin'}</p>
                </div>
                <ChevronDown className={`hidden h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 sm:block ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border/50 bg-card py-1 shadow-modal ring-1 ring-black/[0.04] animate-fade-in" role="menu">
                  <div className="border-b border-border/50 bg-gradient-to-br from-muted/40 to-transparent px-4 py-3.5">
                    <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button type="button" onClick={() => { void handleLogout(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/5" role="menuitem">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  /* ── Main header ── */
  return (
    <>
      <header
        className={`glass-nav sticky top-0 z-50 border-b border-border/40 transition-[box-shadow,border-color] duration-200 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-xl ${
          scrolled ? 'shadow-[0_1px_20px_rgba(0,0,0,0.07)]' : ''
        }`}
      >
        <div className="mx-auto max-w-[1440px] px-3 sm:px-5 lg:px-8">
          <div className="flex h-[4rem] items-center gap-3 sm:gap-4">

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={onMobileMenuToggle}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Institution branding */}
            <InstitutionBranding onNavigate={onNavigate} className="mr-0.5 min-w-0 max-w-[min(42vw,20rem)] sm:max-w-none" />

            {/* ── Desktop search ── */}
            <div
              className="relative mx-2 hidden max-w-lg flex-1 lg:block xl:mx-4 xl:max-w-xl"
              data-search-shell
            >
              <label htmlFor="header-search" className="sr-only">Search campus</label>
              <Search
                className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 z-10 transition-colors ${
                  isSearchFocused || showPanel ? 'text-primary' : 'text-muted-foreground/60'
                }`}
              />
              <input
                ref={desktopInputRef}
                id="header-search"
                type="text"
                placeholder="Search people, posts, jobs…"
                autoComplete="off"
                value={globalQuery}
                onChange={(e) => { setGlobalQuery(e.target.value); setSearchPanelOpen(true); }}
                onFocus={() => { setIsSearchFocused(true); setSearchPanelOpen(true); }}
                onBlur={() => setIsSearchFocused(false)}
                onKeyDown={handleSearchKeyDown}
                className={`${searchInputBase} ${globalQuery ? 'pr-16' : 'pr-12'}`}
                aria-haspopup="listbox"
                aria-expanded={showPanel}
                aria-autocomplete="list"
              />

              {/* Right accessories */}
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                {globalSearchLoading && (
                  <Loader2 className="pointer-events-none h-3.5 w-3.5 animate-spin text-primary" />
                )}
                {globalQuery ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={clearQuery}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  <kbd className="hidden rounded-md border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/70 sm:inline">
                    {SHORTCUT_HINT}
                  </kbd>
                )}
              </div>

              {/* Desktop dropdown */}
              {showPanel && (
                <div
                  role="listbox"
                  aria-label="Search results"
                  aria-live="polite"
                  data-search-shell
                  className="absolute left-0 top-full z-[200] mt-1.5 w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] animate-in fade-in-0 slide-in-from-top-1 duration-150"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-card px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">
                      {globalSearchLoading
                        ? <span className="flex items-center gap-1.5 font-medium"><Loader2 className="h-3 w-3 animate-spin" />Searching…</span>
                        : totalGlobalHits > 0
                          ? `${totalGlobalHits} result${totalGlobalHits === 1 ? '' : 's'}`
                          : null}
                    </span>
                    <button
                      type="button"
                      aria-label="Close search"
                      onClick={closeSearch}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="max-h-[min(68vh,520px)] overflow-y-auto">{panelContent}</div>
                </div>
              )}
            </div>

            {/* Flex spacer (mobile) */}
            <div className="flex-1 lg:hidden" />

            {/* Right controls */}
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">

              {/* Mobile search trigger */}
              <button
                type="button"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
                onClick={() => setMobileSearchOpen(true)}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Nav shortcuts — visible from lg (1024px) */}
              <div className="mr-1 hidden items-center gap-0.5 rounded-xl border border-border/50 bg-muted/30 p-0.5 lg:flex">
                {[
                  { page: 'library',      label: 'Library' },
                  { page: 'teacher',      label: 'Teacher' },
                  { page: 'ai-interview', label: 'AI Interview' },
                ].map((item) => (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => onNavigate(item.page)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                      currentPage === item.page
                        ? 'bg-card text-primary shadow-sm ring-1 ring-border/50'
                        : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Notifications — mobile/tablet only (sidebar handles desktop) */}
              <button
                type="button"
                onClick={() => onNavigate('notifications')}
                className={`${iconBtn(currentPage === 'notifications')} lg:hidden`}
                aria-label={unreadNotifCount > 0 ? `Notifications, ${unreadNotifCount} unread` : 'Notifications'}
              >
                <Bell className="h-5 w-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground shadow-sm">
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Messages — mobile/tablet only */}
              <button
                type="button"
                onClick={() => onNavigate('messages')}
                className={`${iconBtn(currentPage === 'messages')} lg:hidden`}
                aria-label={unreadMsgCount > 0 ? `Messages, ${unreadMsgCount} unread` : 'Messages'}
              >
                <MessageSquare className="h-5 w-5" />
                {unreadMsgCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground shadow-sm">
                    {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                  </span>
                )}
              </button>

              {/* User menu */}
              <div className="relative ml-0.5" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-expanded={showUserMenu}
                  aria-haspopup="menu"
                  className={`group flex items-center gap-2 rounded-xl border p-1 transition-all duration-200 sm:pr-2.5 ${
                    showUserMenu
                      ? 'border-primary/25 bg-primary/[0.06]'
                      : 'border-transparent hover:border-border/60 hover:bg-muted/80 active:scale-[0.98]'
                  }`}
                >
                  <UserAvatar
                    src={headerAvatarSrc(user?.avatar_url)}
                    alt={user?.name || 'User'}
                    size="sm"
                    status={PRESENCE_STATUS.ONLINE}
                    fallbackSrc={FALLBACK_AVATAR}
                    imgClassName="transition-all group-hover:ring-primary/30"
                  />
                  <div className="hidden text-left lg:block">
                    <p className="max-w-[100px] truncate text-xs font-semibold text-foreground">{user?.name || 'User'}</p>
                  </div>
                  <ChevronDown className={`hidden h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 sm:block ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border/50 bg-card py-1 shadow-modal ring-1 ring-black/[0.04] animate-fade-in"
                    role="menu"
                  >
                    <div className="border-b border-border/50 bg-gradient-to-br from-muted/40 to-transparent px-4 py-3.5">
                      <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                      {user?.user_type && (
                        <span className="mt-1.5 inline-block rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                          {user.user_type}
                        </span>
                      )}
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => { onNavigate('profile'); setShowUserMenu(false); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/60"
                        role="menuitem"
                      >
                        <User className="h-4 w-4 text-muted-foreground" /> View Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => { onNavigate('settings'); setShowUserMenu(false); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/60"
                        role="menuitem"
                      >
                        <Settings className="h-4 w-4 text-muted-foreground" /> Settings
                      </button>
                      <div className="my-1 border-t border-border/60" />
                      <button
                        type="button"
                        onClick={() => { void handleLogout(); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile full-screen search overlay ── */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col lg:hidden" role="dialog" aria-modal="true" aria-label="Search">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeMobileSearch}
          />

          {/* Panel */}
          <div className="relative mx-3 mt-3 flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl sm:mx-4">
            {/* Input row */}
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border/50 px-3.5 py-3">
              {globalSearchLoading
                ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                : <Search className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Search people, posts, jobs, events…"
                autoComplete="off"
                value={globalQuery}
                onChange={(e) => { setGlobalQuery(e.target.value); }}
                onKeyDown={handleSearchKeyDown}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {globalQuery ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={clearQuery}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Close search"
                onClick={closeMobileSearch}
                className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            <div
              className="flex-1 overflow-y-auto"
              onMouseDown={(e) => e.preventDefault()}
            >
              {panelContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
