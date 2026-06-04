import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, Bell, MessageSquare, User, Settings, Menu, X, LogOut,
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

/** Present API names that arrive in ALL CAPS as readable title case */
function formatDisplayLabel(text) {
  if (!text || typeof text !== 'string') return text || '';
  const t = text.trim();
  if (!t) return '';
  const letters = t.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 2 && letters === letters.toUpperCase()) {
    return t.toLowerCase().replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
  }
  return t;
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
      <div className="global-search-panel__empty">
        <Search className="global-search-panel__empty-icon" aria-hidden />
        <p className="global-search-panel__empty-title">Start typing to search</p>
        <p className="global-search-panel__empty-hint">Find people, posts, jobs, communities, and events</p>
      </div>
    );
  }

  if (loading && !results) {
    return (
      <div className="global-search-panel__loading">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="global-search-panel__skeleton-row">
            <div className="global-search-panel__skeleton-avatar" />
            <div className="global-search-panel__skeleton-lines">
              <div className="global-search-panel__skeleton-line global-search-panel__skeleton-line--wide" />
              <div className="global-search-panel__skeleton-line global-search-panel__skeleton-line--narrow" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="global-search-panel__empty">
        <SearchX className="global-search-panel__empty-icon" aria-hidden />
        <p className="global-search-panel__empty-title">No results for &ldquo;{query}&rdquo;</p>
        <p className="global-search-panel__empty-hint">Try different keywords or check your spelling</p>
      </div>
    );
  }

  let flatIdx = 0;

  const section = (icon, label, items, renderItem) => {
    if (!items?.length) return null;
    const startIdx = flatIdx;
    flatIdx += items.length;
    return (
      <section className="global-search-panel__section">
        <h3 className="global-search-panel__section-label">
          {icon}
          <span>{label}</span>
        </h3>
        <ul className="global-search-panel__list">{items.map((item, i) => renderItem(item, startIdx + i))}</ul>
      </section>
    );
  };

  return (
    <div className="global-search-panel">
      {hasError ? (
        <div className="global-search-panel__notice">
          Some categories could not be loaded. Showing partial results.
        </div>
      ) : null}

      {section(
        <Users className="h-3.5 w-3.5" aria-hidden />,
        'People',
        results?.users,
        (u, idx) => (
          <li key={u.id}>
            <div
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`global-search-panel__row global-search-panel__row--person ${
                focusedIdx === idx ? 'global-search-panel__row--focused' : ''
              }`}
            >
              <button
                type="button"
                className="global-search-panel__row-main"
                onMouseDown={() => onItemMouseDown({ type: 'user', data: u })}
              >
                <UserAvatar
                  src={headerAvatarSrc(u.avatar_url)}
                  alt={formatDisplayLabel(u.name) || 'User'}
                  size="sm"
                  showStatus={false}
                  fallbackSrc={FALLBACK_AVATAR}
                />
                <span className="global-search-panel__row-text">
                  <span className="global-search-panel__row-title">
                    <HighlightMatch text={formatDisplayLabel(u.name) || 'User'} query={debouncedQuery} />
                  </span>
                  <span className="global-search-panel__row-meta capitalize">
                    {u.user_type || u.role || 'Member'}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="global-search-panel__row-action"
                onMouseDown={() => onItemMouseDown({ type: 'message', data: u })}
              >
                Message
              </button>
            </div>
          </li>
        ),
      )}

      {section(
        <FileText className="h-3.5 w-3.5" aria-hidden />,
        'Posts',
        results?.posts,
        (p, idx) => (
          <li key={p.id}>
            <button
              type="button"
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`global-search-panel__row global-search-panel__row--stacked ${
                focusedIdx === idx ? 'global-search-panel__row--focused' : ''
              }`}
              onMouseDown={() => onItemMouseDown({ type: 'post', data: p })}
            >
              <span className="global-search-panel__row-meta">
                {formatDisplayLabel(p.user?.name) || 'Member'}
              </span>
              <span className="global-search-panel__row-snippet">
                <HighlightMatch text={textSnippet(p.content)} query={debouncedQuery} />
              </span>
            </button>
          </li>
        ),
      )}

      {section(
        <Building2 className="h-3.5 w-3.5" aria-hidden />,
        'Communities',
        results?.communities,
        (c, idx) => (
          <li key={c.id}>
            <button
              type="button"
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`global-search-panel__row global-search-panel__row--stacked ${
                focusedIdx === idx ? 'global-search-panel__row--focused' : ''
              }`}
              onMouseDown={() => onItemMouseDown({ type: 'community', data: c })}
            >
              <span className="global-search-panel__row-title">
                <HighlightMatch text={formatDisplayLabel(c.name)} query={debouncedQuery} />
              </span>
              {c.description ? (
                <span className="global-search-panel__row-snippet">
                  <HighlightMatch text={textSnippet(c.description, 100)} query={debouncedQuery} />
                </span>
              ) : null}
            </button>
          </li>
        ),
      )}

      {section(
        <Briefcase className="h-3.5 w-3.5" aria-hidden />,
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
                className={`global-search-panel__row global-search-panel__row--stacked ${
                  focusedIdx === idx ? 'global-search-panel__row--focused' : ''
                }`}
                onMouseDown={() => onItemMouseDown({ type: 'job', data: j })}
              >
                <span className="global-search-panel__row-title">
                  <HighlightMatch text={formatDisplayLabel(title)} query={debouncedQuery} />
                </span>
                {j.company_name ? (
                  <span className="global-search-panel__row-meta">{j.company_name}</span>
                ) : null}
              </button>
            </li>
          );
        },
      )}

      {section(
        <Calendar className="h-3.5 w-3.5" aria-hidden />,
        'Events',
        results?.events,
        (ev, idx) => (
          <li key={ev.id}>
            <button
              type="button"
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`global-search-panel__row global-search-panel__row--stacked ${
                focusedIdx === idx ? 'global-search-panel__row--focused' : ''
              }`}
              onMouseDown={() => onItemMouseDown({ type: 'event', data: ev })}
            >
              <span className="global-search-panel__row-title">
                <HighlightMatch text={formatDisplayLabel(ev.title) || 'Event'} query={debouncedQuery} />
              </span>
              {ev.start_date ? (
                <span className="global-search-panel__row-meta">{String(ev.start_date)}</span>
              ) : null}
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

  const userMenuDropdown = (compact = false) => (
    showUserMenu ? (
      <div className="app-header__menu animate-fade-in" role="menu">
        <div className="app-header__menu-head">
          <p className="app-header__menu-name">{user?.name}</p>
          <p className="app-header__menu-email">{user?.email}</p>
          {user?.user_type ? (
            <span className="app-header__menu-role">{user.user_type}</span>
          ) : null}
        </div>
        {!compact ? (
          <div className="py-1">
            <button
              type="button"
              onClick={() => { onNavigate('profile'); setShowUserMenu(false); }}
              className="app-header__menu-item"
              role="menuitem"
            >
              <User /> View Profile
            </button>
            <button
              type="button"
              onClick={() => { onNavigate('settings'); setShowUserMenu(false); }}
              className="app-header__menu-item"
              role="menuitem"
            >
              <Settings /> Settings
            </button>
            <div className="app-header__menu-divider" />
            <button
              type="button"
              onClick={() => { void handleLogout(); }}
              className="app-header__menu-item app-header__menu-item--danger"
              role="menuitem"
            >
              <LogOut /> Sign Out
            </button>
          </div>
        ) : (
          <div className="py-1">
            <button
              type="button"
              onClick={() => { void handleLogout(); }}
              className="app-header__menu-item app-header__menu-item--danger"
              role="menuitem"
            >
              <LogOut /> Sign Out
            </button>
          </div>
        )}
      </div>
    ) : null
  );

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
      <header className="app-header">
        <div className="app-header__inner mx-auto max-w-[1440px]">
          <div className="app-header__start">
            <InstitutionBranding onNavigate={onNavigate} variant="header" className="min-w-0" />
            <span className="app-header__super-badge">Super Admin</span>
          </div>
          <div className="app-header__end">
            <div className="app-header__user" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-expanded={showUserMenu}
                aria-haspopup="menu"
                className={`app-header__user-trigger ${showUserMenu ? 'app-header__user-trigger--open' : ''}`}
              >
                <UserAvatar
                  src={headerAvatarSrc(user?.avatar_url)}
                  alt={user?.name || 'Admin'}
                  size="sm"
                  status={PRESENCE_STATUS.ONLINE}
                  fallbackSrc={FALLBACK_AVATAR}
                />
                <div className="app-header__user-text">
                  <p className="app-header__user-name">{user?.name || 'Admin'}</p>
                </div>
                <ChevronDown
                  className={`app-header__user-chevron ${showUserMenu ? 'app-header__user-chevron--open' : ''}`}
                />
              </button>
              {userMenuDropdown(true)}
            </div>
          </div>
        </div>
      </header>
    );
  }

  /* ── Main header ── */
  return (
    <>
      <header className={`app-header ${scrolled ? 'app-header--scrolled' : ''}`}>
        <div className="app-header__inner mx-auto max-w-[1440px]">
          <div className="app-header__start">
            <button
              type="button"
              onClick={onMobileMenuToggle}
              className="app-header__icon-btn md:hidden"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
            <InstitutionBranding
              onNavigate={onNavigate}
              variant="header"
              className="min-w-0 max-w-[min(48vw,14rem)] sm:max-w-[min(42vw,18rem)] md:max-w-none"
            />
          </div>

          <div className="app-header__center" data-search-shell>
            <label htmlFor="header-search" className="sr-only">Search campus</label>
            <div className={`app-header__search ${isSearchFocused || showPanel ? 'focus-within' : ''}`}>
              <Search
                className={`app-header__search-icon ${isSearchFocused || showPanel ? 'app-header__search-icon--active' : ''}`}
                aria-hidden
              />
              <input
                ref={desktopInputRef}
                id="header-search"
                type="text"
                role="combobox"
                placeholder="Search people, posts, jobs, events…"
                autoComplete="off"
                spellCheck={false}
                value={globalQuery}
                onChange={(e) => { setGlobalQuery(e.target.value); setSearchPanelOpen(true); }}
                onFocus={() => { setIsSearchFocused(true); setSearchPanelOpen(true); }}
                onBlur={() => setIsSearchFocused(false)}
                onKeyDown={handleSearchKeyDown}
                className={`app-header__search-input ${globalQuery ? 'app-header__search-input--has-value' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={showPanel}
                aria-autocomplete="list"
              />
              <div className="app-header__search-accessories">
                {globalSearchLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--vh-primary)]" aria-hidden />
                ) : null}
                {globalQuery ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={clearQuery}
                    className="app-header__search-clear"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                ) : (
                  <kbd className="app-header__search-kbd">{SHORTCUT_HINT}</kbd>
                )}
              </div>
              {showPanel ? (
                <div
                  role="listbox"
                  aria-label="Search results"
                  aria-live="polite"
                  data-search-shell
                  className="app-header__search-panel animate-in fade-in-0 slide-in-from-top-1 duration-150"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="app-header__search-panel-head">
                    <span className="app-header__search-panel-status">
                      {globalSearchLoading
                        ? (
                          <span className="app-header__search-panel-status--loading">
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            Searching…
                          </span>
                        )
                        : totalGlobalHits > 0
                          ? `${totalGlobalHits} result${totalGlobalHits === 1 ? '' : 's'}`
                          : globalQuery.trim().length >= 2
                            ? 'No matches'
                            : 'Global search'}
                    </span>
                    <span className="app-header__search-panel-hint" aria-hidden>
                      Esc
                    </span>
                  </div>
                  <div className="app-header__search-panel-body">{panelContent}</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="app-header__end">
            <div className="app-header__spacer" aria-hidden />

            <button
              type="button"
              className="app-header__icon-btn lg:hidden"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Search"
            >
              <Search />
            </button>

            <nav className="app-header__nav" aria-label="Quick navigation">
              {[
                { page: 'library', label: 'Library' },
                { page: 'teacher', label: 'Teacher' },
                { page: 'ai-interview', label: 'AI Interview' },
              ].map((item) => (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => onNavigate(item.page)}
                  className={`app-header__nav-item ${currentPage === item.page ? 'app-header__nav-item--active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className={`app-header__icon-btn lg:hidden ${currentPage === 'notifications' ? 'app-header__icon-btn--active' : ''}`}
              aria-label={unreadNotifCount > 0 ? `Notifications, ${unreadNotifCount} unread` : 'Notifications'}
            >
              <Bell />
              {unreadNotifCount > 0 ? (
                <span className="app-header__badge">
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('messages')}
              className={`app-header__icon-btn lg:hidden ${currentPage === 'messages' ? 'app-header__icon-btn--active' : ''}`}
              aria-label={unreadMsgCount > 0 ? `Messages, ${unreadMsgCount} unread` : 'Messages'}
            >
              <MessageSquare />
              {unreadMsgCount > 0 ? (
                <span className="app-header__badge">
                  {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                </span>
              ) : null}
            </button>

            <div className="app-header__user" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-expanded={showUserMenu}
                aria-haspopup="menu"
                className={`app-header__user-trigger ${showUserMenu ? 'app-header__user-trigger--open' : ''}`}
              >
                <UserAvatar
                  src={headerAvatarSrc(user?.avatar_url)}
                  alt={user?.name || 'User'}
                  size="sm"
                  status={PRESENCE_STATUS.ONLINE}
                  fallbackSrc={FALLBACK_AVATAR}
                />
                <div className="app-header__user-text">
                  <p className="app-header__user-name">{user?.name || 'User'}</p>
                  {user?.user_type ? (
                    <p className="app-header__user-role">{user.user_type}</p>
                  ) : null}
                </div>
                <ChevronDown
                  className={`app-header__user-chevron ${showUserMenu ? 'app-header__user-chevron--open' : ''}`}
                />
              </button>
              {userMenuDropdown(false)}
            </div>
          </div>
        </div>
      </header>

      {mobileSearchOpen ? (
        <div className="app-header__mobile-search" role="dialog" aria-modal="true" aria-label="Search">
          <div className="app-header__mobile-search-backdrop" onClick={closeMobileSearch} aria-hidden />
          <div className="app-header__mobile-search-panel">
            <div className="app-header__mobile-search-input-row">
              {globalSearchLoading
                ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--vh-primary)]" aria-hidden />
                : <Search className="h-4 w-4 shrink-0 text-[var(--vh-primary)] opacity-70" aria-hidden />}
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Search people, posts, jobs, events…"
                autoComplete="off"
                spellCheck={false}
                value={globalQuery}
                onChange={(e) => { setGlobalQuery(e.target.value); }}
                onKeyDown={handleSearchKeyDown}
              />
              {globalQuery ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={clearQuery}
                  className="app-header__search-clear"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Close search"
                onClick={closeMobileSearch}
                className="app-header__mobile-search-done"
              >
                Done
              </button>
            </div>
            <div className="app-header__mobile-search-body" onMouseDown={(e) => e.preventDefault()}>
              {panelContent}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
